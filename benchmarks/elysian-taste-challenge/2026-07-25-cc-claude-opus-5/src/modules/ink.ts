import { env } from "./env";

/** Four inks, or one. The whole plate re-prints either way. */
export function initInkSwitch(button: HTMLButtonElement): void {
  const value = button.querySelector<HTMLElement>("[data-ink-value]");
  const root = document.documentElement;

  const apply = (mode: "iv" | "i"): void => {
    root.dataset.ink = mode;
    button.setAttribute("aria-pressed", String(mode === "i"));
    if (value) value.textContent = mode === "i" ? "I" : "IV";
    button.title =
      mode === "i" ? "Printed in one ink — teal" : "Printed in four inks";
  };

  apply("iv");
  button.addEventListener("click", () => {
    apply(root.dataset.ink === "i" ? "iv" : "i");
  });
}

/** Knock the plates out of register for a moment. */
export function initMisregistration(trigger: HTMLElement): void {
  const root = document.documentElement;
  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    if (!env.reduced) {
      root.classList.add("glitching");
      window.setTimeout(() => root.classList.remove("glitching"), 460);
    }
    window.scrollTo({ top: 0, behavior: env.reduced ? "auto" : "smooth" });
  });
}
