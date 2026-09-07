/** Word-by-word letterpress reveals plus generic scroll-in fades. */
export function initReveal(): void {
  for (const node of document.querySelectorAll<HTMLElement>("[data-split]")) {
    const words = (node.textContent ?? "").trim().split(/\s+/);
    node.replaceChildren();
    words.forEach((word, i) => {
      const wrap = document.createElement("span");
      wrap.className = "word";
      const inner = document.createElement("i");
      inner.textContent = word;
      inner.style.setProperty("--d", `${i * 46}ms`);
      wrap.append(inner);
      node.append(wrap);
      if (i < words.length - 1) node.append(document.createTextNode(" "));
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
  );

  const targets = document.querySelectorAll<HTMLElement>(
    "[data-reveal], [data-split], .aperture",
  );
  for (const el of targets) observer.observe(el);
}
