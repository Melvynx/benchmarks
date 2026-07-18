# Three.js Air Conditioning Understanding

## Objective

Create a premium interactive 3D experience that helps anyone understand how reversible air conditioning moves heat.

The experience must clearly compare:

- a split system with an indoor unit and an outdoor unit connected by refrigerant lines;
- a monoblock system containing the complete refrigeration circuit in one indoor cabinet with separate outdoor intake and exhaust airflow;
- Cooling mode and Heating mode for both systems.

## What the user should understand

After using the experience, a first-time viewer should understand that air conditioning moves heat rather than creating cold, that refrigerant travels in a sealed loop, that indoor and outdoor air remain separate, and that Heating mode reverses the roles of the two heat exchangers.

Show the important HVAC elements clearly: heat exchangers, compressor, expansion device, reversing valve, fans, refrigerant lines, airflow, heat transfer, and condensation where relevant. Use animated particles and a clear legend to distinguish room air, outdoor air, refrigerant, and heat energy.

## Experience requirements

- Use Three.js to create a realistic cutaway scene centered on one wall separating a believable interior from the outdoors.
- Provide controls for Split System / Monoblock and Cooling / Heating.
- Include orbit and zoom controls, Play / Pause, Reset View, and a short replayable guided explanation.
- Use concise labels and small synchronized tutorial messages that explain what is happening without covering the scene.
- Show the current system state, indoor and outdoor temperatures, and where heat is absorbed and released.
- Every visible control must work on desktop and mobile.
- Use the model name as the browser title and the primary visible title, with no additional title text.

## Quality bar

Prioritize exceptional visual quality and realism. The result should feel like a high-end interactive museum exhibit or a premium engineering visualization.

Use convincing proportions, detailed components, physically suggestive materials, refined lighting, shadows, depth, smooth animation, realistic airflow, elegant particles, clean callouts, strong composition, and a sophisticated interface. The scene must remain easy to read while looking cinematic and professionally art-directed.

Choose the visual direction, layout, camera composition, geometry, materials, animation system, and tutorial presentation yourself. Do not follow a prescribed implementation path. Focus on the strongest finished result.

## Technical constraints

- Deliver one self-contained standalone HTML application.
- Load Three.js and official Three.js helpers from a CDN.
- Do not use external images, textures, videos, fonts, APIs, or 3D model files.
- Use procedural geometry and materials.
- Handle resizing, high-DPI screens, reduced motion, and WebGL failure gracefully.
- The application must open directly in a modern browser without a build step.

## Execution discipline

Choose one strong design direction and implement it once. After implementation, perform one concise validation pass covering page load and the essential controls, fix only a blocking error found by that pass, and then stop.

Do not run repeated browser or screenshot review loops. Do not repeatedly redesign, rewrite, polish, or auto-correct the application after it is functional. Do not spend time iterating against your own screenshots. Avoid open-ended self-critique cycles.

Build the experience directly without first explaining your design. Keep the final response brief.

Work only inside the current working directory.

Use pnpm exclusively if dependency installation or package scripts are needed. Do not use npm.
Set the browser title and the primary visible title to your model name, using only identity information already available to you. Add nothing else to either title.
Run the relevant checks yourself. Do not edit files outside the current working directory.
