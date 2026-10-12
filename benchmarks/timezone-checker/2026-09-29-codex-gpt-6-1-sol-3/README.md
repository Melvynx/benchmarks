# GPT-6

A timezone overlap planner built with React, TypeScript, and Vite.

Install dependencies with `pnpm install`, then start the app with one command:

```sh
pnpm dev
```

Open **http://localhost:9197**. The development and preview servers both use port 9197.

## Using the planner

- **Meeting mode** highlights hours when every selected city is awake.
- **Base mode** compares each city independently with the first city. The reference row highlights hours shared with at least one other city.
- Click a city name to promote it to the reference position. Add cities by searching the predefined catalog by city or country.
- Preferences control waking hours and the 12-hour or 24-hour format. Overnight waking hours are supported; equal wake and sleep hours mean available all day.
- Ranges include their start and exclude their end. A `+1` badge marks midnight on the following day.
- Current-date IANA timezone offsets account for daylight saving and fractional offsets. Settings and city order are saved locally in the browser.
- Desktop uses city rows and 24 aligned hour columns; mobile has a separate layout with city columns and hour rows.

## Checks

```sh
pnpm check
pnpm build
```

The timezone calculation and storage modules are kept separate from the interface in `src/lib/`.
