The app does not work yet. `pnpm build` fails with TypeScript errors, including `Cannot find name 'Users'` in `src/App.tsx` and a missing type declaration for the `./styles.css` side-effect import in `src/main.tsx`. In the browser the page renders blank with `ReferenceError: Users is not defined`.

Fix these problems so `pnpm build` passes and the app renders correctly on port 9170. Dependencies are already installed in `node_modules`. Keep the existing design and features; only fix what is broken.

Work only inside the current working directory. Do not read, list, search, or edit files outside the current working directory.
Use pnpm exclusively if dependency installation or package scripts are needed. Do not use npm.
Run the relevant checks yourself.
