# Verification

## Passed static checks
- Read-only TypeScript compiler diagnostics: zero errors, no emit.
- New JSX components parse without errors.
- All local navigation anchors have matching section IDs.
- No em dashes in the new visible copy.
- Document title and primary heading use the supplied benchmark model label: GPT-6 Astra.
- Development and preview scripts and Vite configuration explicitly use strict port 9162.
- All six campaign images were visually inspected; originals remain unchanged and JPEG derivatives are used by the page.

## Environment blocker
The required Portly supervisor could not launch. `portly status` and `portly temp 'pnpm build' --path <current directory> --timeout 2m` failed with Launch Services error -10827 and `Portly is not running and could not be launched`. Launching the existing Portly application executable also terminated with signal 6. Computer Use access to Portly was not approved.

No unmanaged persistent development server was started. The port 9162 HTTP probe returned connection refused. The production build, browser screenshots, responsive runtime checks, and interactive browser verification are therefore **NOT VERIFIED**. Do not treat the pre-existing dist directory as output of this redesign.

## Resume when Portly is available
Run the production build with a Portly temporary job and wait for its result. Start a temporary preview with `pnpm dev` in this directory, using port 9162. Check desktop at 1440 pixels and mobile at 390 and 320 pixels. Verify the save example, suggested search, no-match search, reset, FAQ expansion, mobile navigation, keyboard focus, reduced motion, console errors, and horizontal overflow. Production account, billing, and iOS destinations are linked but no external account or purchase actions were performed.
