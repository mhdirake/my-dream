# Android and web viewport contract

The app keeps its existing mobile-first design. `AppFrame` limits the actual
content column to `AppMaxWidth` (600 CSS/density-independent pixels), including
tablet/native windows. Grids, onboarding artwork and swipe animations read the
measured column width, not a startup snapshot of the whole browser window.

## Ownership

- System bar/cutout insets come from `react-native-safe-area-context`. Never
  guess navigation mode, OS version, user agent or a fixed navigation-bar height.
  Tabs sit above the current bottom inset and leave the same clearance in lists.
- Android uses `resize`, explicit edge-to-edge keyboard-provider flags, and one
  keyboard-controller `KeyboardSurface` per native window. Forms/chat must not
  add another avoiding view. Navigation/status bar visibility remains controlled
  by the OS/user; neither gesture navigation nor three-button navigation is forced.
- A native modal has its own keyboard surface and safe-area provider. Shared
  sheets protect top/side cutouts and keep their actions tappable with the keyboard.
- On web, only `mountWebViewport` owns the sizing CSS variables. It tracks
  `visualViewport` when available and falls back to `innerHeight`, with CSS
  `100vh`/`100dvh` for SSR and pre-hydration. Portal modals use the same visible
  height and top offset; they are not sized from an obscured layout viewport.
- Web resize/scroll events are coalesced per animation frame. Focus settling,
  orientation changes, page restoration and visibility changes re-measure the
  viewport; teardown removes listeners, timers, pending frames and inline CSS.
- Browser chrome changes and pinch zoom are not software keyboards. Zoom is
  never disabled by viewport metadata. Text-entry fields have a 16px minimum
  without imposing a maximum font size; keyboard focus retains a visible outline.
- Swipe remains horizontal. Short windows can scroll the deck instead of losing
  the action row; daily suggestions reserve bottom-inset-aware tab clearance.
  Its web gesture surface allows vertical panning and pinch zoom; the web scroll
  container stays enabled to avoid React Native Web's disabling `touch-action: none`.

## Required device/browser acceptance checks

Run these against the next web build and the **new Android binary**, not an old
installed APK. Native configuration changes require rebuilding. Android builds
remain on the `germany` runner; no runner tags/deployment rules changed here.

| Environment | Checks |
| --- | --- |
| Android gesture navigation | Discover/actions/tabs above gesture area; login/chat keyboard open-close; background/foreground; modal search/gift form. |
| Android three-button navigation | Repeat with the larger bottom inset; verify no overlap or doubled gap and readable OS controls. |
| Android bars hidden/revealed | Reveal transient controls and change navigation mode; content follows actual insets without a hardcoded reserved strip. |
| Android split-screen/tablet | Resize the window; grids remain inside the 600px column and short swipe windows scroll. |
| Android Chrome / Samsung Internet / Firefox | Expand/collapse URL bar, focus inputs, dismiss IME, rotate and return from background. Test both browser tab and installed PWA where supported. |
| iPhone/iPad Safari / standalone PWA | Notch/home-indicator clearance, landscape side cutouts, keyboard/panned viewport, sheet inputs, zoom and app restoration. |
| Desktop Chrome / Edge / Firefox / Safari | Narrow/wide and short windows, browser zoom, keyboard-only navigation, hardware keyboard focus and modal placement. |

Expected: no horizontal spill, inaccessible footer, input hidden behind the IME,
extra keyboard-height padding, duplicate avoidance, or jumping layout on pinch
zoom. Network/auth/chat behavior is not changed by this viewport work.

Automated tests cover geometry, browser lifecycle/resize models, event batching,
focus visibility and cleanup. They simulate browser APIs; they do **not** prove
device rendering or OEM IME behavior. Floating/split keyboards that neither
resize nor expose an occlusion rectangle cannot be reliably inferred by generic
web APIs. Embedded browsers that suppress viewport events need device-specific
verification. Native portrait orientation and PWA manifest portrait preference
are deliberately retained; normal browser tabs can still rotate.

SDK references: [Expo 56 safe area](https://docs.expo.dev/versions/v56.0.0/sdk/safe-area-context/),
[Expo 56 keyboard controller](https://docs.expo.dev/versions/v56.0.0/sdk/keyboard-controller/),
[VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport).
[CSS touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action)
defines the combined vertical-pan/pinch-zoom gesture policy used on swipe cards.
