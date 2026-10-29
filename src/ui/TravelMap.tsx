import { useState } from "react";
import { useGameStore } from "../game/store";
import { MAPS, walkable } from "../game/world-map";
import { AREAS } from "../game/travel-state";
import { navigationGoal, QUEST_NAMES } from "../game/navigation";
import { assetUrl } from "../game/assets";
import type { AreaId, MapObject } from "../game/types";
const MARKERS: Record<string, { symbol: string; name: string }> = {
  D: { symbol: "↗", name: "Dungeon entrance" },
  E: { symbol: "↙", name: "Village path" },
  A: { symbol: "✧", name: "Butterfly Glade entrance" },
  V: { symbol: "↙", name: "Garden path" },
  M: { symbol: "●", name: "Momo" },
  C: { symbol: "◆", name: "Moon charm chest" },
  Q: { symbol: "☁", name: "Cloud guardian" },
  S: { symbol: "✿", name: "Moonflower shrine" },
  G: { symbol: "☾", name: "Moon gate" },
  R: { symbol: "⋈", name: "Lost ribbon" },
  B: { symbol: "●", name: "Picnic berries" },
  T: { symbol: "✧", name: "Garden lantern" },
  L: { symbol: "✧", name: "Butterflies" },
  W: { symbol: "✿", name: "Flower patch" },
  J: { symbol: "═", name: "Friendship bridge" },
  Z: { symbol: "★", name: "Wishing stars" },
  N: { symbol: "●", name: "Pip the bunny" },
  K: { symbol: "♡", name: "Sealed envelope" },
  P: { symbol: "☾", name: "Moonlit picnic" },
};
export function TravelMap() {
  const requested = useGameStore((s) => s.mapOnOpen);
  const a = useGameStore((s) => s.adventure),
    mode = useGameStore((s) => s.mode),
    travel = useGameStore((s) => s.travelTo),
    resume = useGameStore((s) => s.continueAdventure),
    [selected, setSelected] = useState<AreaId>(a.map),
    [expanded, setExpanded] = useState(requested);
  const map = MAPS[selected],
    visited = a.journey.visited.includes(selected),
    current = selected === a.map,
    stop = current ? a : a.journey.stops[selected],
    goal = current ? navigationGoal(a) : null;
  const title = MAPS[selected].title;
  const done = (o: MapObject) =>
    o.type === "C"
      ? a.charms.includes(o.id || "")
      : o.type === "B"
        ? a.berries.includes(o.id || "")
        : o.type === "T"
          ? a.litLanterns.includes(o.id || "")
          : o.type === "Q"
            ? a.guardian
            : o.type === "S"
              ? a.complete
              : o.type === "W"
                ? a.chapter.flowersRevived
                : o.type === "J"
                  ? a.chapter.bridgeFixed
                  : o.type === "N"
                    ? a.chapter.friendAwake
                    : o.type === "Z"
                      ? a.chapter.stars.length === 3
                      : false;
  const visible = (o: MapObject) =>
    o.type === "R"
      ? !a.ribbons.includes(o.id || "")
      : o.type === "K"
        ? a.chapter.friendAwake && !a.chapter.letterFound
        : o.type === "L"
          ? Number(o.id) >= a.chapter.butterflyStep
          : true;
  return (
    <details
      className="travel-map"
      open={expanded}
      onToggle={(e) => setExpanded(e.currentTarget.open)}
    >
      <summary>
        Your little map <small>{MAPS[a.map].title}</small>
      </summary>
      <p className="small-note">
        Follow a quest to draw its next walking route. Return to places you have
        visited without losing your discoveries.
      </p>
      <div className="map-areas" role="group" aria-label="Map areas">
        {AREAS.map((id) => (
          <button
            key={id}
            aria-pressed={selected === id}
            onClick={() => setSelected(id)}
          >
            {MAPS[id].title}
            <small>
              {a.map === id
                ? "Kitty is here"
                : a.journey.visited.includes(id)
                  ? "Visited"
                  : "To discover"}
            </small>
          </button>
        ))}
      </div>
      {visited ? (
        <>
          <svg
            className="quest-map-svg"
            viewBox={`0 0 ${map.w * 24} ${map.h * 24}`}
            role="img"
            aria-labelledby="travel-map-title travel-map-desc"
          >
            <title id="travel-map-title">{title} map</title>
            <desc id="travel-map-desc">
              {stop
                ? `${current ? "Kitty" : "Your last stop"} is at ${stop.x}, ${stop.z}. `
                : ""}
              {goal
                ? `Following ${QUEST_NAMES[a.trackedQuest]}. Next: ${goal.label}. ${goal.route?.steps ?? "Several"} walking steps.`
                : "Choose this area to continue exploring."}
            </desc>
            <rect
              width={map.w * 24}
              height={map.h * 24}
              rx="14"
              fill="#f5ebe5"
            />
            {map.rows.flatMap((row, z) =>
              Array.from(row).map((tile, x) => (
                <rect
                  key={`${x}-${z}`}
                  x={x * 24 + 1}
                  y={z * 24 + 1}
                  width="22"
                  height="22"
                  rx="4"
                  fill={
                    tile === "~"
                      ? "#bad8e1"
                      : tile === "#" || tile === "H"
                        ? "#c7c4cf"
                        : walkable({ ...a, map: selected }, x, z)
                          ? selected === "village"
                            ? "#e2e8ce"
                            : "#eee0ef"
                          : "#e4d3db"
                  }
                />
              )),
            )}
            {goal?.route && goal.route.points.length > 1 && (
              <polyline
                className="map-route"
                points={goal.route.points
                  .map((p) => `${p.x * 24 + 12},${p.z * 24 + 12}`)
                  .join(" ")}
                fill="none"
                stroke="#c3789e"
                strokeWidth="4"
                strokeDasharray="4 5"
                strokeLinecap="round"
              />
            )}
            {map.objects
              .filter((o) => MARKERS[o.type] && visible(o))
              .map((o) => (
                <g
                  key={`${o.type}-${o.id || `${o.x}-${o.z}`}`}
                  opacity={done(o) && goal?.object !== o ? 0.45 : 1}
                  transform={`translate(${o.x * 24 + 12} ${o.z * 24 + 12})`}
                >
                  <title>
                    {MARKERS[o.type].name}
                    {o.id ? ` · ${o.id}` : ""}
                    {done(o) ? " · discovered" : ""}
                  </title>
                  {goal?.object === o && (
                    <circle
                      className="map-goal"
                      r="11"
                      fill="#f5d997"
                      stroke="#bf8c66"
                      strokeWidth="1.5"
                    />
                  )}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={o.type === "C" ? 13 : 16}
                    fill="#89667e"
                  >
                    {MARKERS[o.type].symbol}
                  </text>
                </g>
              ))}
            {stop && (
              <g
                transform={`translate(${stop.x * 24 + 12} ${stop.z * 24 + 12})`}
              >
                <circle
                  r="10"
                  fill="#fff5ec"
                  stroke="#ba7197"
                  strokeWidth="2"
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="15"
                  fill="#bb759b"
                >
                  ♥
                </text>
              </g>
            )}
          </svg>
          <div className="map-legend">
            <span>♥ {current ? "Kitty" : "Last stop"}</span>
            <span>◎ Next objective</span>
            <span>┄ Walking route</span>
          </div>
          {goal && (
            <p className="map-next" role="status">
              Next · <strong>{goal.label}</strong>
              {goal.prerequisite ? " · restore the moonflower first" : ""}
              {goal.route
                ? ` · ${goal.route.steps} ${goal.route.steps === 1 ? "step" : "steps"} away`
                : ""}
            </p>
          )}
          {!current && (
            <p className="small-note">
              {stop
                ? "Your last stop is marked with a heart."
                : "Return at this place’s entrance."}{" "}
              Your discoveries stay with you.
            </p>
          )}
          <button
            className="primary wide"
            onClick={() => (current ? resume() : travel(selected))}
          >
            {current
              ? mode === "room"
                ? "Continue adventure here"
                : "Back to this spot"
              : `Return to ${title}`}
          </button>
        </>
      ) : (
        <div className="unvisited-map">
          <img
            alt=""
            src={assetUrl(
              `assets/quest/${selected === "glade" ? "butterfly" : "moonflower"}.svg`,
            )}
          />
          <p>
            {selected === "garden"
              ? "Enter the pink arch in Rosemilk Village to discover the garden."
              : "Find the lilac arch in the garden, or choose Butterfly Glade from the mission panel."}
          </p>
          <small>Your walking map will open after your first visit.</small>
        </div>
      )}
    </details>
  );
}
