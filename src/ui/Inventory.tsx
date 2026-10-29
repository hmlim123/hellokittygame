import { lazy, Suspense } from "react";
const WardrobePreview = lazy(() => import("../scenes/WardrobePreview"));
import { useGameStore } from "../game/store";
import { ITEMS, OUTFITS, questJournal, questText } from "../game/domain";
import { assetUrl } from "../game/assets";
import { Dialog } from "./Dialog";
const art = (kind: "outfit" | "item", id: string) =>
  assetUrl(
    kind === "item" && id === "teddy"
      ? "assets/quest/momo.svg"
      : `assets/inventory/${id}.svg`,
  );
export function Inventory() {
  const equipment = useGameStore((s) => s.equipment),
    quest = useGameStore((s) => s.adventure),
    tab = useGameStore((s) => s.inventoryTab),
    set = useGameStore.setState,
    equip = useGameStore((s) => s.equip),
    follow = useGameStore((s) => s.followQuest),
    close = useGameStore((s) => s.closePanel),
    failed = useGameStore((s) => s.saveFailed);
  const outfit = OUTFITS.find((o) => o.id === equipment.outfit)!,
    item = ITEMS.find((i) => i.id === equipment.item)!;
  const tabs = ["clothes", "items", "quest"] as const;
  return (
    <Dialog
      title="Kitty’s inventory"
      onClose={close}
      className="inventory-dialog"
    >
      <span className="eyebrow">YOUR LITTLE ADVENTURE</span>
      <h2>Kitty’s inventory</h2>
      <div
        className="tabs"
        role="tablist"
        aria-label="Inventory sections"
        onKeyDown={(e) => {
          const i = tabs.indexOf(tab);
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
            e.preventDefault();
            const next =
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? 2
                  : (i + (e.key === "ArrowRight" ? 1 : 2)) % 3;
            set({ inventoryTab: tabs[next] });
            document.getElementById(`inventory-${tabs[next]}`)?.focus();
          }
        }}
      >
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            id={`inventory-${t}`}
            aria-selected={tab === t}
            aria-controls={`inventory-panel-${t}`}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => set({ inventoryTab: t })}
          >
            {t === "clothes" ? "Clothes" : t === "items" ? "Items" : "Quest"}
          </button>
        ))}
      </div>
      <div
        className={`inventory-layout ${tab === "quest" ? "quest-view" : ""}`}
      >
        {tab !== "quest" && (
          <section
            className="outfit-preview"
            aria-label="Equipped outfit preview"
            data-outfit={equipment.outfit}
            data-item={equipment.item}
          >
            <div className="preview-canvas">
              <Suspense fallback={<span>Getting dressed…</span>}>
                <WardrobePreview
                  equipment={equipment}
                  label={`${outfit.name}, ${item.name}`}
                />
              </Suspense>
            </div>
            <strong>{outfit.name}</strong>
            <span>{item.name}</span>
            <small>Drag to look around · 360°</small>
          </section>
        )}
        {tab === "clothes" && (
          <section
            role="tabpanel"
            id="inventory-panel-clothes"
            aria-labelledby="inventory-clothes"
          >
            <p>Pick a little outfit. Kitty changes right away.</p>
            <div className="equipment-grid">
              {OUTFITS.map((o) => (
                <button
                  key={o.id}
                  aria-label={o.name}
                  aria-pressed={equipment.outfit === o.id}
                  disabled={!o.unlock(quest)}
                  onClick={() => equip("outfit", o.id)}
                >
                  <img alt="" src={art("outfit", o.id)} />
                  <strong>{o.name}</strong>
                  <small>
                    {!o.unlock(quest)
                      ? o.hint
                      : equipment.outfit === o.id
                        ? "Wearing now"
                        : "Equip outfit"}
                  </small>
                </button>
              ))}
            </div>
          </section>
        )}
        {tab === "items" && (
          <section
            role="tabpanel"
            id="inventory-panel-items"
            aria-labelledby="inventory-items"
          >
            <p>Choose what Kitty carries, at home and on her adventure.</p>
            <div className="equipment-grid">
              {ITEMS.map((i) => (
                <button
                  key={i.id}
                  aria-label={i.name}
                  aria-pressed={equipment.item === i.id}
                  onClick={() => equip("item", i.id)}
                >
                  <img alt="" src={art("item", i.id)} />
                  <strong>{i.name}</strong>
                  <small>
                    {equipment.item === i.id ? "Equipped" : "Equip item"}
                  </small>
                </button>
              ))}
            </div>
          </section>
        )}
        {tab === "quest" && (
          <section
            role="tabpanel"
            id="inventory-panel-quest"
            aria-labelledby="inventory-quest"
          >
            <p>{questText(quest)}</p>
            <div className="charms">
              {[
                ["rose", "Rose"],
                ["honey", "Honey"],
                ["sky", "Sky"],
              ].map(([id, name]) => (
                <span
                  key={id}
                  className={quest.charms.includes(id) ? "" : "missing"}
                  aria-label={`${name} charm, ${quest.charms.includes(id) ? "collected" : "missing"}`}
                >
                  <img alt="" src={assetUrl(`assets/quest/${id}.svg`)} />
                  {name}
                </span>
              ))}
            </div>
            <div className="quest-journal">
              {questJournal(quest).map((q) => (
                <article
                  key={q.id}
                  data-quest={q.id}
                  className={`quest-card ${q.done ? "quest-done" : ""}`}
                >
                  <h3>
                    {q.done ? "✓ " : ""}
                    {q.title}
                  </h3>
                  <p>{q.progress}</p>
                  <small>Reward · {q.reward}</small>
                  {!q.done && (
                    <button
                      aria-pressed={quest.trackedQuest === q.id}
                      onClick={() => follow(q.id)}
                    >
                      {quest.trackedQuest === q.id
                        ? "Following this quest"
                        : "Follow quest"}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
      <div className="memory-actions">
        <button onClick={() => useGameStore.getState().openMemory()}>
          Your storybook ♡
        </button>
        <button onClick={() => useGameStore.getState().openPanel("photo")}>
          Photo corner ↗
        </button>
      </div>
      <p className="inventory-status" role="status">
        Wearing {outfit.name} · {item.name}
      </p>
      <p className="save-note">
        {failed
          ? "Saving unavailable. This visit will still work."
          : "Your outfit follows Kitty between her room and adventure."}
      </p>
      <button className="primary wide" onClick={close}>
        Back to Kitty
      </button>
    </Dialog>
  );
}
