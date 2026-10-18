# Hold for 2x

Chrome extension (Manifest V3). Press and hold on any video, or hold the space bar, to play it at 2x. Let go and it returns to normal speed. Works on any site with an HTML `<video>`, including OTT players that have no speed control. Planned public launch on GitHub at `github.com/xmanojpx/hold-for-2x`.

This file is the handoff from the Claude chat where the project was started. Read it fully before changing anything.

## How to work with the owner

- Plain, conversational language. No jargon-heavy explanations.
- Keep it minimal. The tool exists for one thing, a temporary 2x. Do not add features that normal OTT players already have.
- Ask before adding any new UI element or feature. The owner has said this explicitly.
- Do not claim something works unless it was run. The chat environment had no browser and no network, so nothing below has been tested in a real browser (see "Not verified").

## Current state (v2.3.0)

Working and in the repo folder:

- Hold the left mouse button on a playing video for about 250 ms. Speed goes to the hold speed. Release returns it to the previous rate.
- Hold the space bar for the same effect. A quick tap still plays and pauses.
- Hold speed is configurable from the toolbar popup (stepper, or type a value). Range 1.25x to 4x, default 2x. Saved in `chrome.storage.local` under `holdSpeed`.
- `[` and `]` change the hold speed in 0.25x steps on any page.
- A small badge shows the speed while holding and briefly when the speed changes.
- Popup follows the system light/dark theme.

## File map

```
manifest.json        MV3, permission: storage, content script on <all_urls>, all_frames, document_start
src/content.js       all page behavior (hold detection, space handling, badge, key shortcuts)
src/popup.html       toolbar popup markup
src/popup.css        popup styles (light/dark via prefers-color-scheme)
src/popup.js         stepper, typed input, clamping, hint message
icons/               icon16/48/128.png (blue rounded square, two white forward triangles)
README.md, LICENSE (MIT), .gitignore
```

No build step. Load unpacked at `chrome://extensions` with Developer mode on.

## Behavior details that were deliberate

Do not "simplify" these without understanding why they exist.

- **Listeners are on `window` in the capture phase** so they run before the site's own handlers. All frames are covered (`all_frames: true`) because many players live in iframes.
- **Finding the video:** `videoAt(x, y)` checks bounding rects of all videos (including inside shadow roots) instead of using the click target, because overlays sit on top of the `<video>` on most OTT sites. A fallback picks a large playing video if none is under the cursor.
- **Safe bottom zone:** the bottom 15% of the video is ignored so the seek bar and controls keep working.
- **Movement cancels a hold** (over 10 px before the timer fires) so dragging a seek bar does not trigger 2x.
- **Speed is re-applied every 150 ms while held**, because players reset `playbackRate` on their own.
- **After a mouse hold, the next click is swallowed for 300 ms** so releasing does not pause the video. `pointerup` and `mouseup` propagation is also stopped when a hold was active.
- **Space bar:** keydown and keyup for plain Space are intercepted (capture, `stopImmediatePropagation`) only when a video of at least 100x100 visible px exists and the target is not an input, textarea, select, or editable element. A tap (released before the hold timer) toggles play/pause directly on the video element. Space with Shift, Ctrl, Alt, or Cmd is ignored. With no video on the page, space is left alone so the page scrolls.
- **The badge lives in a closed shadow root**, built with DOM APIs (not `innerHTML`) so Trusted Types pages like YouTube do not block it. It is appended to the fullscreen element when there is one.
- **Cap is 4x** because browser audio tends to break up beyond that. Minimum is 1.25x.
- **Reduced motion is respected** (badge fade and button transitions turn off).

## Design decisions (v2.3.0 popup)

- Direction: "Warm Premium" from the `visual-direction` skill (flitzrrr/frontend-design-skills), checked against `ui-design`, `web-typography`, `color-theory`.
- Fonts: Fraunces (speed number, wordmark) + Work Sans (everything else). Two families max. Bundled as WOFF2 in `fonts/` (OFL), never loaded from a CDN.
- Type scale (Perfect Fourth from 16): 12 / 16 / 21 / 28, display 88. Spacing on an 8px grid. Buttons 44x44.
- Light tokens: bg `#F5F0EB`, raised `#FBF8F4`, text `#1A1A1A`, muted `#5E574D`, accent bronze `#9A6436`.
- Dark tokens (own scheme, not inverted): bg `#1A1816`, raised `#221F1C`, control `#2C2824`, text `#E6E0D6`, muted `#A39B8F`, accent `#D0A57A`.
- Shadows from `beautiful-shadows` (sm on controls, md on the card); subtle top-edge highlight from `css-border-gradient`.
- Motion: the number settles 5px on each change (220ms, cubic-bezier(.22,1,.36,1)); everything off under reduced motion.
- Speed number uses `field-sizing: content` so the "x" sits right after it.

## Versioning

- Semantic versioning, tags `vX.Y.Z`, notes in `CHANGELOG.md`. Bump `manifest.json` version with every release.
- `main` holds released versions only. New work goes on `feature/*` branches and merges after the owner approves.
- v3 (customizable on-video badge) is in progress on `feature/v3-badge`.

## Not verified

None of this has been run in a real browser by Claude. First things to check once Claude Code can run it:

1. Load unpacked and confirm no manifest or console errors.
2. Mouse hold and space hold on YouTube, Plex, and at least one of Netflix, Prime Video, Hotstar. The owner reported the earlier mouse-hold version working on the sites they tried and failing on Plex before a fix, but the Plex fix was never re-confirmed.
3. Space tap on each site. Netflix is the most likely to misbehave because the extension pauses and plays the `<video>` element directly rather than going through the site's player.
4. Popup rendering in light and dark. The popup design was only seen as static mockups.

## Open decision: optional extras

Mockups were shown for four extras. The owner has not said which to build. Do not build any until they choose.

| Extra | Note |
| --- | --- |
| On/off switch in the popup | Overlaps with the per-site switch. Chrome already has an on/off on the extensions page. Recommended to skip. |
| Preset chips (1.5x, 2x, 3x) | Optional. The stepper and typed input already cover this. |
| Per-site switch ("Active on netflix.com") | Most useful of the four. Needs the `tabs` or `activeTab` permission to read the current site. |
| Rebindable shortcut keys | Heaviest and cluttered for little use. Recommended to skip. |

## Next steps, in order

1. Get the owner's answer on the extras, then finalize the product.
2. Test on real sites (see "Not verified") and fix anything found.
3. Publish to GitHub as `xmanojpx/hold-for-2x` (public). The repo was never created because the chat had no GitHub access. Needs the owner's go-ahead before pushing:
   ```
   git init && git add . && git commit -m "Initial commit"
   git branch -M main
   gh repo create xmanojpx/hold-for-2x --public --source=. --push
   ```
   LICENSE currently lists `xmanojpx` as copyright holder. Confirm that is what the owner wants.
4. Only after the product is final: make the launch video with the two tools the owner named.
   - **Hyperframes** (`github.com/heygen-com/hyperframes`): turns HTML plus seekable animation into a deterministic MP4. Needs Node 22+ and FFmpeg. For Claude Code: `claude plugin marketplace add heygen-com/hyperframes` then `claude plugin install hyperframes@hyperframes`, then use `/hyperframes`. The `/product-launch-video` workflow is the closest fit. Manual route: `npx hyperframes init`, `preview`, `render`.
   - **/brag** (`github.com/latent-spaces/brag`): an agent skill built on Hyperframes that plans the story, music, motion, and share copy. For Claude Code: `/plugin marketplace add latent-spaces/brag`, `/plugin install brag@brag`, then ask "let's /brag". Output lands in `brag-output/` with a `brag.mp4`. Voiceover is off unless `--voice` is passed.
   - Suggested story for the video: someone skipping through a slow part of a show on a laptop, holding the mouse, the badge showing 2x, releasing back to normal. Short (20 to 30 seconds), no feature tour, ends on the install line.
5. A landing page for the launch was floated but the owner has not asked for one. Do not build it unless they confirm.

## Rules for this repo

- Keep the extension free of network requests and analytics. The README promises it collects nothing and only stores the chosen speed locally.
- Keep permissions minimal. Currently only `storage`. Adding any permission needs the owner's approval and a README update.
- Keep the README honest. Do not list sites as "supported" unless they were actually tested.
