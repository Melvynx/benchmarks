---
name: verify
description: Verify the Elysian Vite landing page through its browser surface.
---

1. Start the app with `npm run dev -- --host 127.0.0.1 --port 4173`.
2. Use `dev-browser --headless` against `http://127.0.0.1:4173`.
3. Verify at 1440×1000 and 390×844. Wait at least 3 seconds for the opening curtain.
4. Capture the hero, open/close the full-screen menu, click each scent-note tab, scroll through the ritual, and navigate to `#invitation` from the menu.
5. Check `document.documentElement.scrollWidth === window.innerWidth` on mobile and collect `console`/`pageerror` events during a reload and interaction pass.
