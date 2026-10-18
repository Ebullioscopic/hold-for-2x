# Hold for 2x

Chrome extension (Manifest V3). Press and hold on any video, or hold the space bar, to play it at 2x. Let go and it returns to normal speed. Works on any site with an HTML `<video>`, including OTT players that have no speed control. Planned public launch on GitHub at `github.com/xmanojpx/hold-for-2x`.

This file is the handoff from the Claude chat where the project was started. Read it fully before changing anything.

## How to work with the owner

- Plain, conversational language. No jargon-heavy explanations.
- Keep it minimal. The tool exists for one thing, a temporary 2x. Do not add features that normal OTT players already have.
- Ask before adding any new UI element or feature. The owner has said this explicitly.
- Do not claim something works unless it was run. The chat environment had no browser and no network, so nothing below has been tested in a real browser (see "Not verified").

## Current state (v2.4.0)

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
icons/               icon16/48/128.png (slate rounded square, two white forward triangles)
fonts/               Geist + Geist Mono WOFF2 and their OFL licenses
scripts/package.sh   builds the release zip into dist/
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

## Design decisions (v2.4.0 popup)

- Style: Frost UI (soft glass, low blur, neutral colours), chosen by the owner from six styles in the dev.to "Modern Web Design Styles" guide. Earlier rejected: cobalt system look, Paper, Warm Premium.
- Fonts: Geist (text, title, speed number) + Geist Mono (label, scale numbers, keys). Bundled WOFF2 in `fonts/` (OFL). Font roles are CSS variables: `--font`, `--display`, `--meta`, `--unit-font`.
- Light: page `#EEF0F3` with soft glows `#DCE5FA` / `#F3E5EE`, frosted card `rgba(255,255,255,.58)` + 10px blur, text `#1C1F24`, muted `#5C6470`, accent slate `#3E4C66`.
- Dark (own scheme): page `#15171B`, glows `#1F2840` / `#2A1F29`, card `rgba(255,255,255,.06)`, text `#E8EAED`, muted `#9AA1AC`, accent `#AFBBD4`.
- 8px spacing, 46px buttons, ruler slider snapping to 0.25x with keyboard support. Number settles 4px on change; reduced motion turns it off.
- Speed number uses `field-sizing: content` so the "x" sits right after it.
- Icon: slate `#3E4C66` rounded square with two white triangles.

## Versioning

- Semantic versioning, tags `vX.Y.Z`, notes in `CHANGELOG.md`. Bump `manifest.json` version with every release.
- `main` holds released versions only. New work goes on `feature/*` branches and merges after the owner approves.
- v3 (customizable on-video badge) is in progress on `feature/v3-badge` (local only). Owner also wants in v3: an "off on this site" switch with a "remember always" option (needs `activeTab`).
- Releases: `scripts/package.sh` builds `dist/hold-for-2x-vX.Y.Z.zip` (extension files only). Attach it to the GitHub Release for the tag.

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
