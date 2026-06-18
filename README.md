# SkyEye Showcase Public Page

This repository hosts the public static GitHub Pages version of the SkyEye showcase animation.

Public page:

https://overact.github.io/SkyEye_showcase_pages/

Source project:

https://github.com/overact/SkyEye_showcase

The source project remains private. This public repository contains only the static files needed
to serve the browser animation and its voice-over audio on GitHub Pages.

## Contents

- `index.html` redirects visitors to the animation page.
- `animation/index.html` contains the playable SkyEye animation.
- `animation/css/` and `animation/js/` contain the self-hosted frontend assets.
- `animation/assets/` contains static images used by the animation, including the endcard QR code.
- `animation/audio/voiceover.mp3` is the narration used by the public page.

## Update Note

When the private source project changes, rebuild or copy the static page assets here and push to
`main`. GitHub Pages publishes from `main` at the repository root.
