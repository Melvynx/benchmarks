const CLOSINGS = [
  "is being cut by hand. Wait for the hour of departure.",
  "has been entered in the ledger. We will not be hurried.",
  "is filed under places you have not been yet.",
];

/** The last movement: a name goes in, a wax seal comes down. */
export function initThreshold(form: HTMLFormElement): void {
  const input = form.querySelector<HTMLInputElement>("#keyName");
  const error = form.querySelector<HTMLElement>("#keyError");
  const box = document.getElementById("sealbox");
  const msg = document.getElementById("sealMsg");
  if (!input || !error || !box || !msg) return;

  input.addEventListener("input", () => {
    error.hidden = true;
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (name.length < 2) {
      error.hidden = false;
      input.focus();
      return;
    }

    const first = name.split(/\s+/)[0];
    const closing = CLOSINGS[first.length % CLOSINGS.length];
    msg.textContent = `${first}, your key ${closing}`;

    form.hidden = true;
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add("is-stamped"));
  });
}
