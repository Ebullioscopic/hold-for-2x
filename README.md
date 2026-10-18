# Hold for 2x

Press and hold on any video to watch it at 2x. Let go and it drops back to normal.

It works the way holding the screen does in a phone video app, but on the web, including sites whose players have no speed control of their own. Videos play at normal speed until you hold.

## Install

There's no build step.

1. Download or clone this repo.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and choose the `hold-for-2x` folder.
4. Refresh any video tab that was already open.

Works in Chrome and other Chromium browsers (Edge, Brave).

## Use

- **Hold** the left mouse button on a playing video. After a quarter of a second it speeds up. Release to go back.
- **Hold the space bar** to do the same thing from the keyboard. A quick tap still plays and pauses.
- **Set your speed** from the toolbar icon. Type a value, use the + and − buttons, or drag the ruler. The default is 2x, and anything from 1.25x to 4x works.
- **Change it from the keyboard** with `[` (slower) and `]` (faster), in steps of 0.25x. A small badge shows the new speed.

## Good to know

- A quick click still pauses and plays as normal. The bottom strip of the video is left alone so the seek bar and buttons keep working.
- It only works in the browser, not in desktop or TV apps.
- Some players try to reset the playback speed. While you hold, the extension keeps it pinned.
- Speed is capped at 4x because audio tends to break up beyond that.

## Privacy

The extension collects nothing and makes no network requests. The only thing it stores is your chosen speed, locally in your browser.

## Credits

The popup uses [Fraunces](https://github.com/undercasetype/Fraunces) and [Work Sans](https://github.com/weiweihuanghuang/Work-Sans), both under the SIL Open Font License 1.1. The font files and their licenses are in `fonts/`.

## License

MIT. See `CHANGELOG.md` for version history.
