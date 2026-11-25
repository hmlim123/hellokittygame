import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { MathUtils, type Group } from "three";
import {
  MARKET_COLLECTION_DELAY_MS, MARKET_COLLECTION_MS, MARKET_HANDOFF_MS, MARKET_STALL,
  MARKET_WRAP_MS, atMarketSpot, type MarketDelivery, type MarketRole,
} from "../../shared/village-market.mjs";
import { useVillageMotion, walkToMarket } from "../game/village-motion";
import { useVisitsStore } from "../game/visits";
import { visitTime } from "../game/visit-clock";
import { useReducedMotion } from "./use-reduced-motion";
import { SceneHtml } from "./SceneHtml";
import { ToyFriend } from "./GameToys";

const CUSTOMER = { x: -1.38, z: 0.48 };

function parcelFrame(group: Group, role: MarketRole, now: number, delivery: MarketDelivery | undefined,
  wrapped: boolean, wrappedAt: number, handed: boolean, reduced: boolean) {
  const x = role === "host" ? 0.65 : -0.65;
  const handedAt = delivery?.[role] ?? 0;
  const finished = delivery?.completedAt ?? 0;
  const collection = finished ? now - finished - MARKET_COLLECTION_DELAY_MS : -Infinity;
  const useDelivery = handedAt > 0 && collection < MARKET_COLLECTION_MS;
  group.visible = wrapped || useDelivery;
  group.scale.setScalar(1);
  group.rotation.set(0, 0, 0);
  if (!group.visible) return "away";
  if (!useDelivery) {
    group.position.set(x, handed ? 1.09 : 0.82, handed ? 0.12 : 1.05);
    if (!reduced && !handed && wrappedAt && now < wrappedAt + MARKET_WRAP_MS) {
      const time = MathUtils.smoothstep(now - wrappedAt, 0, MARKET_WRAP_MS);
      group.scale.setScalar(MathUtils.lerp(0.42, 1, time));
      group.position.y += Math.sin(time * Math.PI) * 0.18;
      group.rotation.y = MathUtils.lerp(-0.8, 0, time);
      return "wrapping";
    }
    return handed ? "counter" : "wrapped";
  }

  if (collection >= 0) {
    const progress = MathUtils.clamp(collection / MARKET_COLLECTION_MS, 0, 1);
    const accepted = !!delivery?.delivered;
    group.position.set(
      reduced || !accepted ? x : MathUtils.lerp(x, CUSTOMER.x, progress),
      reduced ? 1.09 : 1.09 + Math.sin(progress * Math.PI) * 0.24,
      reduced ? 0.12 : MathUtils.lerp(0.12, accepted ? CUSTOMER.z : 1.05, progress),
    );
    if (!reduced) group.scale.setScalar(1 - progress);
    return accepted ? "collected" : "returned";
  }

  const flight = MathUtils.clamp((now - handedAt) / MARKET_HANDOFF_MS, 0, 1);
  const progress = reduced ? 1 : MathUtils.smoothstep(flight, 0, 1);
  group.position.set(x, MathUtils.lerp(0.82, 1.09, progress) + Math.sin(progress * Math.PI) * 0.43,
    MathUtils.lerp(1.05, 0.12, progress));
  if (!reduced) group.rotation.x = Math.sin(progress * Math.PI) * 0.22;
  return flight < 1 && !reduced ? "landing" : "counter";
}

function MarketParcels() {
  const host = useRef<Group>(null);
  const guest = useRef<Group>(null);
  const reduced = useReducedMotion();
  useFrame(({ gl, invalidate }) => {
    const { role, villageMarket: market, clockOffset } = useVisitsStore.getState();
    if (!role || !market || !host.current || !guest.current) return;
    const now = visitTime() + clockOffset;
    for (const [seat, object] of [["host", host.current], ["guest", guest.current]] as const) {
      const local = seat === role;
      const handed = local ? market.own.handed : market.partnerHanded;
      const wrapped = local ? !!market.own.item : !!market.partnerWrapped || handed;
      const wrappedAt = (local ? market.own.wrappedAt : market.partnerWrappedAt) ?? 0;
      const phase = parcelFrame(object, seat, now, market.delivery, wrapped, wrappedAt, handed, reduced);
      const attribute = seat === "host" ? "hostMarketParcel" : "guestMarketParcel";
      if (gl.domElement.dataset[attribute] !== phase) gl.domElement.dataset[attribute] = phase;
      if (phase === "wrapping") invalidate();
    }
    const delivery = market.delivery;
    if (delivery && (delivery.completedAt
      ? now < delivery.completedAt + MARKET_COLLECTION_DELAY_MS + MARKET_COLLECTION_MS
      : now < Math.max(delivery.host, delivery.guest) + MARKET_HANDOFF_MS)) invalidate();
  });
  return <>
    {([["host", host, "#cc87a0"], ["guest", guest, "#b394c6"]] as const).map(([role, parcel, color]) => (
      <group key={role} ref={parcel} visible={false}>
        <RoundedBox args={[0.42, 0.23, 0.38]} radius={0.035}>
          <meshStandardMaterial color="#efe0b8" />
        </RoundedBox>
        <mesh position={[0, 0.005, 0]}>
          <boxGeometry args={[0.08, 0.245, 0.4]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
    ))}
  </>;
}

function MarketCustomer({ name, delivery }: { name: string | null; delivery?: MarketDelivery }) {
  const offset = useVisitsStore((s) => s.clockOffset);
  const [now, setNow] = useState(visitTime);
  const pickup = delivery?.completedAt ? delivery.completedAt + MARKET_COLLECTION_DELAY_MS - offset : 0;
  const end = pickup ? pickup + MARKET_COLLECTION_MS : 0;
  useEffect(() => {
    if (!pickup) return;
    const current = visitTime();
    setNow(current);
    const timers = [pickup, end].filter((moment) => moment > current)
      .map((moment) => setTimeout(() => setNow(visitTime()), moment - current + 10));
    return () => timers.forEach(clearTimeout);
  }, [pickup, end]);
  const customer = pickup && now < end ? delivery?.customer ?? name : name;
  if (customer !== "Momo" && customer !== "Pip") return null;
  return <ToyFriend key={customer} name={customer} position={[CUSTOMER.x, 0, CUSTOMER.z]} scale={0.86}
    rotation={[0, 0.7, 0]} greetSignal={delivery?.delivered && now >= pickup && now < end ? delivery.completedAt : 0} />;
}

export function VillageMarketStall() {
  const market = useVisitsStore((s) => s.villageMarket);
  const role = useVisitsStore((s) => s.role);
  const bothAtStall = useVisitsStore((s) => s.players.length === 2 &&
    s.players.every((player) => player.connected && atMarketSpot(player, player.id)));
  if (!market || !role) return null;
  const customer = market.customer ?? market.servedCustomer;
  return (
    <group position={[MARKET_STALL.x, 0, MARKET_STALL.z]} onClick={(event) => {
      if (event.delta >= 8) return;
      event.stopPropagation();
      if (useVillageMotion.getState().marketPanel !== "open") walkToMarket(role);
    }}>
      <RoundedBox args={[2.65, 0.15, 0.78]} radius={0.06} position={[0, 0.9, 0]}>
        <meshStandardMaterial color="#bf8f78" />
      </RoundedBox>
      <RoundedBox args={[2.45, 0.79, 0.58]} radius={0.07} position={[0, 0.42, 0]}>
        <meshStandardMaterial color="#e7b3b8" />
      </RoundedBox>
      {[-1.16, 1.16].map((x) => (
        <mesh key={x} position={[x, 1.53, -0.24]}>
          <boxGeometry args={[0.11, 1.28, 0.12]} />
          <meshStandardMaterial color="#bf8f78" />
        </mesh>
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <RoundedBox key={i} args={[0.42, 0.12, 0.95]} radius={0.045}
          position={[(i - 3) * 0.41, 2.13, 0.025]} rotation={[0.2, 0, 0]}>
          <meshStandardMaterial color={i % 2 ? "#fff3df" : "#d891ae"} />
        </RoundedBox>
      ))}
      <SceneHtml center position={[0, 2.49, 0]} zIndexRange={[3, 0]}>
        <span className="village-landmark">LITTLE VILLAGE MARKET</span>
      </SceneHtml>
      {bothAtStall && <MarketCustomer name={customer} delivery={market.delivery} />}
      <MarketParcels />
    </group>
  );
}
