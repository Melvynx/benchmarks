# Lumail launch film

Public research checked on 2026-09-30. No local Lumail project was inspected.

- https://lumail.io — current positioning; document-style editor; AI drafts, segments and schedules with user review; visual workflows; campaigns and transactional sending; pay for sent emails rather than stored subscribers; 3,000 monthly free emails with no card.
- https://lumail.io/docs — product scope and intended audience: creators and small teams.
- https://lumail.io/about — simple, fast email marketing focused on creators.
- https://webclaw.io/data/startups/company/lumail.io — public brand extraction dated 2026-08-28: #F7F8F8, #8A8F98, #0D0E10, #C9CCD1, #08090A; detected typefaces Inter, Geist Mono and Geist. This is an older reference; live visual inspection was blocked.

## Direction

16:9, 45 seconds, 30 fps. Restrained near-black and off-white direction, bold whole-line typography, vector envelope motion, product-inspired interface choreography, animated workflow routing, and an original electronic score. Product interfaces are illustrative, not captured live screens. Native Helvetica Neue/Menlo substitutes for the public site's detected fonts, which could not be downloaded. Lumail's name and domain remain prominent. No third-party logos or testimonial claims are used.

## Timeline

0–4: Fall in love with email
4–8: Lumail reveal
8–15: Document-style editor and AI polish
15–22: AI campaign operations and approval
22–29: Automated journeys
29–34: Campaigns and priority transactional lane
34–39: Unlimited subscribers; pay for emails sent
39–45: Free-plan CTA at lumail.io

## Build

`render.swift` creates the deterministic frames. `soundtrack.py` synthesizes the original stereo score without samples or dependencies. `video.mp4` uses H.264/yuv420p plus AAC and a faststart MP4 container. `index.html` is a native video player without visible headings or third-party dependencies; its browser title is GPT-6.

The sandbox blocked dependency downloads, Portly app startup and dev-browser operations. Rendering used installed native graphics and FFmpeg inside the already Portly-managed task. Browser playback could not be verified; see `evidence/verification.json` for the completed media and static checks.
