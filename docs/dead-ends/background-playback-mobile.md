# Background Playback on Mobile — Dead End

**Goal:** Keep audio playing when the phone screen is off or the browser is backgrounded, so Mixtape behaves like a native music player (Spotify, YouTube Music app) on mobile.

---

## Attempt 1: Silent Oscillator

Play an inaudible tone (gain 0) via Web Audio API `OscillatorNode` to prevent the browser from suspending the AudioContext.

**Result:** Fails. The browser doesn't just suspend the audio graph — it freezes the entire tab. The Web Audio API context staying alive doesn't matter when `setTimeout`, `fetch`, and the `<audio>` element's network request all stop being serviced.

---

## Attempt 2: Enhanced Media Session API

Set up `navigator.mediaSession` with full metadata, lock-screen artwork, `setPositionState`, and action handlers for play/pause/seek/next/prev.

**Result:** Fails. The Media Session API provides lock-screen controls and metadata display, but it is purely a metadata/control surface. It does not act as a keepalive — the browser still freezes the tab after ~5 minutes of screen-off, and the audio stops when the buffer drains. The controls remain visible and responsive on the lock screen, but tapping "play" does nothing because the tab is frozen.

---

## Root Cause

Chromium on Android suspends all `ActiveDOMObjects` for a tab ~5 minutes after the screen turns off. This includes:

- `setTimeout` / `setInterval` — can't schedule new data fetches
- `fetch` / `XMLHttpRequest` — can't request more audio data
- MSE `SourceBuffer.appendBuffer()` — can't feed new segments
- WebSocket — connection stalls

This isn't a bug. It's a deliberate power-saving policy in Blink, implemented by calling `suspend()` on every `ActiveDOMObject` associated with the page. The `<audio>` element itself is not suspended — it would keep playing if it had data. But without timers or network, the buffer drains and playback stops.

**Chromium bug:** [Issue 41132724](https://issues.chromium.org/41132724) ("audio stops playing with the screen off on android with media source extensions") — opened October 2014, still open and unresolved as of 2026. Multiple workaround attempts have been proposed over the years (dedicated worker keepalives, beacon API, visibility state hacks), but none bypass the fundamental mechanism: the browser decides when to freeze a tab, and the web page has no API to prevent it.

On iOS/Safari, the situation is similar — Safari freezes background tabs aggressively, and PWA support for background audio has been historically unreliable.

---

## Why It's Unfixable on the Web

No web API exists that can prevent a browser from freezing a background tab. This is by design — it's an OS-level power management policy enforced by the browser engine. The web platform intentionally does not give pages the ability to keep running indefinitely in the background, as that would be a battery life and security concern.

Even Google's own products suffer from this:
- **YouTube Music (web app/PWA):** Same problem. Audio stops after screen-off.
- **YouTube (web):** Background playback is a Premium-only feature, and even then it works inconsistently on the web. Google's recommended solution is the native app.
- **YouTube Music (native Android app):** Works correctly. Uses `MediaSessionService` — an Android Service that runs independently of any Activity or UI lifecycle.

---

## The Real Solution

A native Android app using Android's `MediaSessionService` (from Jetpack Media3). This is a proper OS-level Service that:

- Runs independently of any UI (Activity, WebView, etc.)
- Continues playback even if the app UI is killed
- Integrates with Android's audio focus system
- Provides lock-screen controls natively (not via web API)
- Is not subject to tab freezing or `ActiveDOMObject` suspension

For Mixtape, this means an Android app that either:
1. **WebView wrapper + native media bridge** — Embeds Mixtape's UI in a WebView, but routes audio playback through a native `MediaSessionService`. Significant effort — requires a Kotlin/Java Android project, a JavaScript bridge, and maintaining two audio playback paths.
2. **Companion native app** — A standalone music player app that reads from the same Mixtape server API. Doubles the frontend work (native UI in Kotlin/Swift vs. React web UI).
3. **Capacitor / Tauri mobile** — Wraps the web UI in a native shell with plugin bridges. Tauri v2 has mobile support but audio backgrounding via WebView on Android is still not straightforward — the WebView itself is subject to the same suspension policies.

**Current stance:** Not worth pursuing for a solo project. The effort-to-impact ratio is poor — it requires either a parallel native codebase or a complex hybrid architecture, and the benefit is "audio keeps playing when the phone screen is off." Desktop packaging (compiled binary + OS service) is a much higher priority and serves the primary use case (home music server) better.
