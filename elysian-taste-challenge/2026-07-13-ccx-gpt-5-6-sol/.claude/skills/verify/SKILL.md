---
name: verify
summary: Drive the Elysian Vite landing page in a headless browser.
---

# Verify Elysian

1. Start the app with `pnpm dev -- --host 127.0.0.1` and use the printed localhost URL.
2. Use `dev-browser --headless` to open the page at 1440×1000 and 390×844.
3. Capture the hero, then navigate to `#the-bloom`, `#formula`, and `#edition` to trigger scroll reveals.
4. Click each `.note` control and confirm the specimen title and `aria-pressed` state change.
5. Submit the private-access form with an empty email to confirm native validation, then with a valid email to confirm the success state.
6. Check `document.body.scrollWidth === window.innerWidth`, listen for `pageerror`, and verify keyboard focus plus reduced-motion rendering.

Full-page screenshots only show scroll reveals after each `[data-reveal]` element has been scrolled into view.
