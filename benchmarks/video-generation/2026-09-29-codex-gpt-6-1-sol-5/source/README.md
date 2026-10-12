# Lumail — Momentum

The delivered player is `../index.html`; the finished film is `../video.mp4`.

`render.py` is the deterministic 1920 × 1080, 60 fps picture source. `music.py` synthesizes the original 45-second stereo score at 128 BPM. Both use the existing Python 3.13 environment with Pillow and NumPy. FFmpeg performs encoding and muxing. No JavaScript dependencies or package installation were needed.

The public research and art direction are in `research.md`. All scenes are custom vector/type compositions. The Inter font is used only by the offline renderer; the player has no font or script dependencies.

Run bounded rendering jobs through Portly where it is available:

```sh
job_id="$(portly temp '/opt/homebrew/bin/python3.13 source/render.py --stills --render' --path "$PWD" --timeout 30m)"
portly wait "$job_id"
```

Independent metadata and full video-frame decoding evidence are recorded in `../verification/media.json` and `../verification/report.json`. `verify-browser.js` contains the local-player playback/seek check. Its attempted run was blocked by the sandbox before browser access; the exact error is in `../verification/browser.log`.
