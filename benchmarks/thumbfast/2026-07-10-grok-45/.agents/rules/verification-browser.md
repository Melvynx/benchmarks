# Verification Browser

Use this when verifying local or deployed UI, screenshots, navigation, interactions, auth, or any browser-visible behavior.

## When this applies

- The user asks to "verify", test a feature in the browser, check UI behavior, or confirm an authenticated flow.

## Rules

- **ALWAYS** use the `dev-browser` skill with `dev-browser --connect` for browser verification so automation attaches to a signed-in browser session.
- **ALWAYS** use email OTP for app login during verification when login is needed.
- Find a suitable test account with a Convex query; prefer accounts that clearly contain test data.
- Trigger the OTP from the browser, then read the latest OTP from Convex evidence: first `.logs/convex.txt`, then `convex logs` or a test-only Convex helper query if needed.
- If no OTP appears in Convex logs, add a temporary or test-scoped OTP log before retrying the sign-in flow.
- Use the OTP code from Convex to sign in and continue testing the requested feature.
- When using Helium, connect through the explicit CDP endpoint if auto-discovery cannot attach to the signed-in browser.
