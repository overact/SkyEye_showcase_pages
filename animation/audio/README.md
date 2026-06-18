Place the final narration file here as:

```text
voiceover.mp3
```

Then enable it in `animation/index.html` by changing:

```html
<audio id="voiceover" preload="auto"></audio>
```

to:

```html
<audio id="voiceover" src="audio/voiceover.mp3" preload="auto"></audio>
```

Browser playback will sync the file with play, pause, restart, and scene jumps. The export script also muxes this file into `exports/skyeye-showcase.mp4` when it exists.
