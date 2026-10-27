# Video promo — Creative Design

Remotion (React + TypeScript) project for the site's promo video. Output: `out/promo-16x9.mp4` (1920×1080) and `out/promo-9x16.mp4` (1080×1920), ~41 s at 30 fps.

## Commands

```bash
npm run studio   # live preview in the browser, to adjust and watch it
npm run render   # renders both MP4s into out/
```

## Change texts, colors or duration → `src/config.ts`

- **Texts:** `copy.captions` (one per scene), `copy.url`, `copy.cta`, `copy.instagram`.
- **Colors:** `brand`.
- **Title cards:** `copy.title1` and `copy.title2`.
- **Duration:** `timing.scenes` sets each scene's length in beats (`BEAT` = 15 frames = 0.5 s, 120 bpm). The total is recalculated automatically. `timing.cut` sets how long the dissolves last.
- **Reel:** `REEL_SAFE` in `src/motion.ts` sets the band where text stays clear of Instagram's interface.

## Change scenes → `src/scenes/`

One file per scene. The order and type of cut (zoom, whip, blur) live in `src/Promo.tsx`.

- **Speed ramps:** the `SEGMENTS` at the top of each scene with footage: which part of the recording plays and at what speed (`rate`).
- **Camera:** each scene's `keys(frame, [[frame, value], …])` calls (tilt, orbit, zoom, framing). The punch-ins are anchored to the recorded clicks.
- **Pointer:** it's drawn from the path saved in `public/capture/recordings.json`; headless recordings don't show one.

## Re-capture the site (after changing it)

```bash
# in the repo root
npm run build && npx astro preview --port 4399
# in video/
node capture/capture.ts               # screenshots + recordings
RECORD_ONLY=1 node capture/capture.ts # recordings only
```

It saves everything to `public/capture/`. The recordings aren't screen-recorded: they're captured **frame by frame at 60 fps on a virtual clock**. The page's clock only advances 1/60 s per photo, and the CSS, Web Animations and view-transition animations are synced to it. That means no frame can drop, no matter how slow the machine is (~7 min for all of them). `recordings.json` stores the mouse path, the clicks and the marks for each one.

`ONLY=rec-gallery node capture/capture.ts` re-records only the ones you name.
