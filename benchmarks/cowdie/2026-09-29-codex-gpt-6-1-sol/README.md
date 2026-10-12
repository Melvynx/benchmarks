# Cowdie

A dependency-free, real WebGL virtual pet meadow. Feed, play, bathe, pet, and nap with an expressive cow. Progress, coins, achievements, and your pet's name are saved on your device.

## Run

Use `pnpm dev` (port **9192**). Development servers should be managed with Portly where available. `pnpm check` checks all JavaScript syntax; `pnpm build` produces the standalone `dist` folder; `pnpm preview` serves that build on port 9192.

Drag the meadow to rotate the camera. Click Cowdie to pet them. Snack time offers three foods with different prices and nourishment. Playing earns coins, while all care earns friendship XP. The toolbar includes sound, a day/night toggle, camera reset, photo download, fullscreen, and pet-name settings. The journal and rewards record real care milestones.

The included tiny 3D engine uses WebGL meshes, perspective projection, depth testing, lighting, and hierarchical animation. No external 3D models, package downloads, or runtime services are required. The optional Google Fonts stylesheet falls back to system fonts offline.
