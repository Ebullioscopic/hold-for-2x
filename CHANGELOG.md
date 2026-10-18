# Changelog

All notable changes to Hold for 2x. Versions follow [Semantic Versioning](https://semver.org/).

## [2.4.0] - 2026-10-18

### Changed
- New popup style, Frost UI: soft frosted glass over neutral light, with its own dark mode.
- Fonts are now Geist (text and the speed number) and Geist Mono (labels, scale, keys), bundled under the SIL Open Font License. Fraunces and Work Sans are removed.
- Slate toolbar icon to match.

### Added
- Downloadable zip on each GitHub Release.

## [2.3.0] - 2026-10-18

### Changed
- Redesigned the toolbar popup: warm paper palette with a single bronze accent, large serif speed readout, and a ruler you can click or drag (snaps to 0.25x).
- New toolbar icon to match.
- The popup confirms a change in its hint line ("Saved. Your next hold plays at 2.5x.").
- Larger tap targets (44px) and text sizes on a fixed type scale.

### Added
- Bundled fonts: Fraunces and Work Sans (SIL Open Font License, see `fonts/`). They load from the extension itself, so there are still no network requests.
- Keyboard support on the ruler (arrow keys, Home, End).

## [2.2.0] - 2026-10-18

### Added
- Hold the left mouse button on a playing video to speed it up; release to return.
- Hold the space bar for the same effect; a quick tap still plays and pauses.
- Hold speed from 1.25x to 4x, set from the popup or with `[` and `]`.
- On-screen badge while holding.

[2.4.0]: https://github.com/xmanojpx/hold-for-2x/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/xmanojpx/hold-for-2x/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/xmanojpx/hold-for-2x/releases/tag/v2.2.0
