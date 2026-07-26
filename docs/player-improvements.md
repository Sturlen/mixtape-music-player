# Player Improvements

Add standard playback features (shuffle, repeat) and refactor the state model so desired state (user intent) is cleanly separated from actual state (audio element reality). The shuffle and repeat logic must be backed by unit tests.

---

## Current Problems

### State model: desired vs actual are mixed

The store (`Player.tsx`) has parallel state for playback status:

| Field | Updates from | Meaning |
|-------|-------------|---------|
| `_playbackState` | Audio element events: `onPlay`, `onPause`, `onEnded`, `onError` | What the `<audio>` element is actually doing |
| `requestedPlaybackState` | User actions: `play()`, `pause()`, `queueSkip()` | What the user wants to happen |

These drift apart. Example: `queueSkip()` sets `requestedPlaybackState="playing"` in the store, but the audio element hasn't loaded the new track yet, so `_playbackState` is still `"paused"`. The bridge (`PlayerProvider.tsx`) has to paper over the gap with an `isLoading` flag that is itself unreliable.

### Bridge has too many independent effects

`PlayerProvider.tsx` has **7 `useEffect`s** that independently poke the audio element:

1. Source load (line 118)
2. Play/pause (line 126)
3. Playback rate (line 139)
4. Auto-play after load (line 152)
5. Volume (line 103)
6. Seek (line 110)
7. Visibility resume (line 163)

These can fire in any order. The volume effect can fire between source-load and auto-play. The seek effect can fire before the source is loaded. No single reconciliation pass ties them together.

### No repeat mode

`onEnded` unconditionally calls `queueSkip()`. There is no `repeatMode` state, so repeat-one and repeat-all can't be implemented without touching the event handler.

### Shuffle destroys original order

`queueShuffle()` replaces `queueTracks` in-place with Fisher-Yates. Toggling shuffle off just shuffles again — the original order is lost. Users can't un-shuffle back to the order they originally selected.

### `requestedPlaybackState` persisted in dev

`partialize` saves `requestedPlaybackState` in dev mode. On page reload the store says `"playing"` but the audio element is fresh and paused. The auto-play effect tries to `play()` and the browser blocks it.

---

## Proposed Model: Desired vs Actual

### Store shape

```typescript
type RepeatMode = "off" | "all" | "one"

type PlayerStore = {
  // What the user wants
  desired: {
    trackId: string | null
    playbackState: "playing" | "paused"
    seekPosition: number | null  // pending seek, consumed by bridge
    playbackRate: number
  }

  // What the audio element reports
  actual: {
    trackId: string | null
    playbackState: "playing" | "paused" | "loading" | "ended"
    position: number
    duration: number
  }

  // Queue (source of truth for available tracks)
  queue: {
    originalTracks: Track[]       // never mutated
    shuffledOrder: number[] | null  // null = linear, array = permutation
    index: number
    repeatMode: RepeatMode
  }

  volume: number
}
```

### Bridge: reconciler function, not a useEffect

A `useEffect` that maps `desired → actual` looks clean on paper but breaks on autoplay denial:

```
1. desired.playbackState = "playing"
2. useEffect fires, calls audio.play()
3. Browser rejects play() → nothing happens
4. desired still "playing", actual still "paused"
5. useEffect deps haven't changed → **never retries**
```

The browser can say "no" to `play()` for many reasons (no user gesture, policy, audio focus). When it does, neither `desired` nor `actual` changed — but we still need to retry. A reactive effect can't express this.

**Split the reconciler into two layers: a pure decision function + an executor that acts on the audio element.**

### Pure decision function

Returns an action type instead of directly calling `audio.play()`. Fully testable with zero DOM:

```typescript
type Action =
  | { type: "load"; trackId: string }
  | { type: "seek"; position: number }
  | { type: "play" }
  | { type: "pause" }
  | { type: "advance" }       // queue next track
  | { type: "retry"; attempt: number }  // play() was denied, schedule retry
  | { type: "none" }

function decide(desired: Desired, actual: Actual, playAttempts: number): Action
```

Test inputs vs expected outputs:

| desired | actual | playAttempts | → | action |
|---------|--------|-------------|---|--------|
| playing | paused | 0 | → | `play` |
| paused | playing | 0 | → | `pause` |
| { trackId: "X" } | { trackId: "Y" } | 0 | → | `load` |
| { seekPosition: 5 } | — | 0 | → | `seek` |
| playing | ended | 0 | → | `advance` |
| playing | paused | 3 | → | `retry` attempt 3 |

### Executor

Thin layer that interprets actions and calls the audio element:

```typescript
function execute(audio: HTMLAudioElement, action: Action) {
  switch (action.type) {
    case "play":
      audio.play().catch(() => onPlayDenied())
      break
    case "pause":
      audio.pause()
      break
    case "load":
      audio.src = resolveUrl(action.trackId)
      audio.load()
      break
    // ...
  }
}
```

### Retry scheduling

Pure function for backoff calculation:

```typescript
function retryDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 10000)
}
```

Test: `retryDelay(0) → 1000`, `retryDelay(1) → 2000`, `retryDelay(4) → 10000`.

The executor wires `scheduleRetry(() => reconcile())` on play denial. The timer is cancelled if `desired.playbackState` changes to `"paused"` between ticks.

### Triggers

`reconcile()` (decide + execute) is called whenever:

| Trigger | Why |
|---------|-----|
| User action mutates `desired` | e.g., `play()`, `pause()`, `skip()` — new intent to reconcile |
| Audio element fires an event | e.g., `canplay` (source ready), `ended` (track finished), `error` (something broke) — reality changed |
| Visibility changes to visible | User came back — browser may now allow `play()` |
| Retry timer fires | Browser denied `play()`, we schedule a retry with backoff |
| User clicks/taps the UI | Gesture may satisfy autoplay policy on retry |

React is used for rendering and event wiring only — not for lifecycle management of the audio element.

### Preloading (future)

Preloading the next track's source URL is a separate concern from the reconcile loop. It doesn't affect desired or actual state — it's a background optimization that reduces the gap between a track ending and the next one starting.

**Current approach (works but coupled):**
- `PlayerProvider.tsx` line 68–86: React Query `prefetchQuery` triggered by a `useEffect` watching `currentTime / duration >= 0.85`
- Guarded by `prefetchedRef.current === currentTrack.id` to avoid re-prefetching

**Integration in the new model:**

Preloading is not part of `decide()` or `execute()` — those deal with the current track. Instead, it's an independent function that reads from `actual.position` and `queue`:

```typescript
function checkPreload(actual: Actual, queue: QueueState, preloadedRef: Set<string>) {
  const currentTrackDuration = actual.duration
  const nearEnd = currentTrackDuration > 0 && (
    actual.position / currentTrackDuration >= 0.85 ||
    currentTrackDuration - actual.position <= 1
  )
  if (!nearEnd) return

  const nextTrack = resolveNextTrack(queue)
  if (!nextTrack || preloadedRef.has(nextTrack.id)) return

  preloadedRef.add(nextTrack.id)
  return { type: "preload" as const, trackId: nextTrack.id }
}
```

Called from the same position-reporting path as `actual.position` updates (i.e., the `timeupdate` event handler, after updating `actual.position`):

```typescript
onTimeUpdate: (position) => {
  set({ actual: { ...get().actual, position } })
  const preload = checkPreload(get().actual, get().queue, preloadedRef)
  if (preload) fetchPlaybackUrl(preload.trackId)
},
```

Key details:
- **Guard is per-track, not per-source.** `preloadedRef` is a `Set<trackId>`, not a single ref. This handles the case where the user skips back to a previously preloaded track — the next preload will be for a different track.
- **Preloading is a query cache operation**, not a state machine transition. It populates React Query's cache so when `desired.trackId` changes and `execute("load")` runs, the URL is already cached.
- **Check on both relative and absolute thresholds:** `>= 0.85` for long tracks, `<= 1s remaining` for short tracks. The `<= 1s` case catches tracks shorter than ~6.7s that would never reach 0.85.

### Queue as pure functions

Extract queue operations into pure functions that take state and return state:

```typescript
// Given current queue and repeat mode, what's the next track index?
function advanceQueue(
  queue: QueueState,
  repeatMode: RepeatMode,
): { nextIndex: number; shouldStop: boolean }

// Toggle shuffle: builds or clears the shuffled permutation
function toggleShuffle(
  originalTracks: Track[],
  currentIndex: number,
  wasShuffled: boolean,
): { shuffledOrder: number[] | null; newIndex: number }

// Remove a track from the queue, adjusting index if needed
function removeFromQueue(
  originalTracks: Track[],
  shuffledOrder: number[] | null,
  currentIndex: number,
  removeIndex: number,
): { tracks: Track[]; order: number[] | null; index: number }
```

These are unit-testable without Zustand, React, or the DOM.

---

## Implementation Plan

### Phase 1: Pure queue functions + tests

- [ ] Write `advanceQueue()` — handles repeat-off (stop at end), repeat-all (wrap), repeat-one (same index)
- [ ] Write `toggleShuffle()` — preserves original order, creates/clears shuffled permutation
- [ ] Write `removeFromQueue()` — shifts index correctly whether shuffled or not
- [ ] Unit tests for all three — test every combination of repeat mode, shuffle on/off, edge cases (empty queue, single track, last track removed)

### Phase 2: Store refactor

- [ ] Split store into `desired` / `actual` / `queue` sections
- [ ] Remove `_playbackState` — replace with `actual.playbackState`
- [ ] Remove `requestedPlaybackState` — replace with `desired.playbackState`
- [ ] Remove `isShuffled` boolean — replace with `queue.shuffledOrder` (null = not shuffled)
- [ ] Add `queue.repeatMode`
- [ ] Wire queue functions into store actions (`queueSkip`, `queuePrev`, `queueShuffle`, `queueRemove`)
- [ ] Don't persist `desired` in `partialize` — only persist `queue` and `volume`

### Phase 3: Bridge refactor

- [ ] Write `decide()` — pure function returning `Action` type, test first
- [ ] Write `retryDelay()` — pure function for backoff calculation, test first
- [ ] Write `execute()` — thin wrapper that maps actions to `HTMLAudioElement` calls
- [ ] Wire triggers: call `execute(decide(...))` after desired mutations, on audio events, on visibility change, on retry timer ticks
- [ ] Audio events (`onPlay`, `onPause`, `onEnded`, `onError`, `onCanPlay`) only update `actual` — never touch `desired`
- [ ] User actions (`play()`, `pause()`, `seek()`, `queueSkip()`) only update `desired` — never touch `actual`, then call `reconcile()`
- [ ] Remove all 7 existing `useEffect`s — replace with the `decide→execute` invocation pattern
- [ ] Retry is cancelled if `desired.playbackState` becomes "paused" before the timer fires

### Phase 4: Shuffle + repeat UI

- [ ] Shuffle toggle button — calls `queueShuffle()` action
- [ ] Repeat cycle button — cycles through `"off" → "all" → "one" → "off"`
- [ ] Visual indicators: highlight active shuffle/repeat, show repeat-one icon

### Phase 5: Battle-test with tests

#### Unit tests (`bun test`, no DOM, sub-ms)

| Test group | What | Input → output |
|------------|------|----------------|
| `decide()` | Every desired/actual combination maps to correct action | 20+ pure function assertions |
| `retryDelay()` | Backoff is exponential, capped at 10s | `f(n) → ms` |
| `advanceQueue()` | Repeat off, repeat all, repeat one, edge cases | `(queue, mode) → next index` |
| `toggleShuffle()` | Preserves original order, toggle on/off | `(tracks, index, wasOn) → new state` |
| `removeFromQueue()` | Index shifts correctly, shuffled or not | `(queue, removeIdx) → new queue` |
| Store actions | dispatching `play()`, `pause()`, `skip()` correctly mutates `desired` and `queue` | `store → action → assert state` |

#### Playwright E2E tests (real browser, real playback)

| Test | Scenario | What to assert |
|------|----------|----------------|
| Basic playback | Play a track, wait | Audio element has `currentTime > 0` |
| Queue skip | Play → skip to next | Track ID changes, playback continues |
| Track end auto-advance | Play a short track, let it end | Queue index increments, next track plays |
| Repeat one | Enable repeat-one, let track end | Same track replays (index unchanged) |
| Repeat all | Enable repeat-all, play last track | Queue wraps to index 0 |
| Shuffle | Toggle shuffle on | Track order differs from queue order |
| Shuffle off | Toggle shuffle off | Original queue order restored |
| Remove from queue | Remove a track mid-queue | Index adjusts, playback continues |
