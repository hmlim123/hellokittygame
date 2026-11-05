import { useGameStore } from "../game/store";
import {
  RECIPES,
  recipeUnlocked,
  decorationUnlocked,
  deliveryGoal,
  cookieName,
} from "../game/cozy";
import { Dialog } from "./Dialog";
export function RecipeBook() {
  const c = useGameStore((s) => s.cozy),
    a = useGameStore((s) => s.adventure);
  return (
    <details className="recipe-book">
      <summary>
        Your recipe cards ·{" "}
        {RECIPES.filter((r) => recipeUnlocked(r.id, c, a)).length} of 4
      </summary>
      <div className="recipe-cards">
        {RECIPES.map((r) => {
          const unlocked = recipeUnlocked(r.id, c, a);
          return (
            <article key={r.id} data-recipe={r.id} data-unlocked={unlocked}>
              <h3>
                {r.name} {unlocked ? "♡" : "✧"}
              </h3>
              <p>
                {unlocked
                  ? `A little recipe to make together. ${r.action}.`
                  : r.hint}
              </p>
              <button
                disabled={!unlocked || c.cookie.stage !== "shape"}
                aria-pressed={(c.cookie.recipe || "butter") === r.id}
                onClick={() => useGameStore.getState().chooseRecipe(r.id)}
              >
                Make {r.name.toLowerCase()}
              </button>
            </article>
          );
        })}
      </div>
      <p className="small-note">
        Choose a recipe before decorating, or start another batch after giving
        your cookie.
      </p>
    </details>
  );
}
export function CozyLifePanel() {
  const c = useGameStore((s) => s.cozy),
    a = useGameStore((s) => s.adventure),
    close = useGameStore((s) => s.closePanel),
    s = useGameStore.getState;
  const goal = deliveryGoal(c);
  return (
    <Dialog title="Your cozy corner" onClose={close}>
      <span className="eyebrow">LITTLE THINGS THAT MAKE A HOME</span>
      <h2>Your cozy corner</h2>
      <section className="delivery-card" data-delivery={c.delivery.step}>
        <h3>
          {c.delivery.step === "done" ? "A recipe carried home ♡" : goal.title}
        </h3>
        <p>
          {c.delivery.step === "done"
            ? "Momo loved your cookie. Pip shared her mint, and a strawberry recipe card and a soft cushion are yours to keep."
            : goal.instruction}
        </p>
        {c.delivery.active && (
          <button onClick={() => s().pauseDelivery()}>
            Pause this delivery
          </button>
        )}
        {c.delivery.step !== "done" && (
          <button className="primary" onClick={() => s().startDelivery()}>
            {c.delivery.active
              ? "Continue cookie delivery"
              : "Start a little cookie delivery"}
          </button>
        )}
        {c.delivery.active && c.delivery.step === "home" && (
          <button onClick={() => s().setMode("room")}>
            Bring the recipe home ♡
          </button>
        )}
        {c.delivery.step === "done" && (
          <button
            onClick={() => {
              s().newCookie();
              s().chooseRecipe("strawberry");
              s().openPanel("baking");
            }}
          >
            Try your strawberry recipe
          </button>
        )}
      </section>
      <details open className="corner-arranger">
        <summary>Arrange your little keepsakes</summary>
        {(["cushion", "frame", "flowers"] as const).map((item) => {
          const earned = decorationUnlocked(item, c, a);
          return (
            <fieldset key={item} disabled={!earned}>
              <legend>
                {item[0].toUpperCase() + item.slice(1)} {earned ? "♡" : "✧"}
              </legend>
              {!earned && (
                <p className="small-note">
                  {item === "cushion"
                    ? "Bring the delivery recipe home."
                    : item === "frame"
                      ? "Save your first postcard."
                      : "Revive the glade’s thirsty flowers."}
                </p>
              )}
              <div className="photo-options">
                {(["rug", "chair", "nook"] as const).map((spot, i) => (
                  <button
                    key={spot}
                    aria-pressed={c.corner[item] === spot}
                    onClick={() => s().decorateCorner(item, spot)}
                  >
                    {item === "cushion"
                      ? ["By the rug", "Reading chair", "Little nook"][i]
                      : item === "frame"
                        ? ["Rose wall", "Window side", "Keepsake wall"][i]
                        : ["Near the lamp", "Window corner", "Tea-side nook"][
                            i
                          ]}
                  </button>
                ))}
              </div>
            </fieldset>
          );
        })}
        <button onClick={close}>See it in Kitty’s room ↗</button>
      </details>
      <fieldset>
        <legend>A little afternoon atmosphere</legend>
        <div className="photo-options">
          <button
            aria-pressed={c.weather === "sunny"}
            onClick={() => s().setWeather("sunny")}
          >
            Soft sunshine ☀
          </button>
          <button
            aria-pressed={c.weather === "rain"}
            onClick={() => s().setWeather("rain")}
          >
            Rainy afternoon ☂
          </button>
        </div>
        <label className="rain-sound">
          <input
            type="checkbox"
            checked={c.rainSound}
            onChange={(e) => s().setWeather(c.weather, e.target.checked)}
          />{" "}
          Gentle rain sounds
        </label>
        <p className="small-note">
          Rain sounds play only when the room’s Sound button is on. No rush and
          no weather penalties.
        </p>
      </fieldset>
      <details>
        <summary>Little things your friends remember</summary>
        {(["momo", "pip"] as const).map((who) => (
          <p key={who}>
            <strong>{who === "momo" ? "Momo" : "Pip"}</strong> ·{" "}
            {c.friends[who].last
              ? `Your ${cookieName(c.friends[who].last!)}, lovingly remembered.`
              : "A little memory waiting to happen."}
          </p>
        ))}
      </details>
      <button className="wide" onClick={close}>
        Back to Kitty
      </button>
    </Dialog>
  );
}
