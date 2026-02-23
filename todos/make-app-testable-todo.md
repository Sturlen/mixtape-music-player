# Make App Testable

## Problem

The app has side effects at module load time and relies on global state, making it impossible to test the actual routes.

## Action Items

- [ ] Extract `db` object into a factory parameter - move `db` definition from `src/index.tsx:44` into a `createApp({ db })` function, removing the global const
- [ ] Extract Fuse instances into factory parameters - move `fuse_artists`, `fuse_albums`, `fuse_playlists` from `src/lib/fuse.ts` into the factory, passing them as `{ fuseInstances }`
- [ ] Create `createApp()` factory function - wrap the Elysia app definition in a function that accepts `{ db, fuseInstances, sources, env }` and returns the app without calling `.listen()`
- [ ] Remove `await reloadLibrary()` from module scope - move it into a separate entry point file (e.g., `src/server.tsx`) that calls `createApp()` and then `reloadLibrary()` and `.listen()`
- [ ] Remove `.listen()` from module scope - move to the entry point file, keeping `src/index.tsx` as a pure app definition export
- [ ] Make `reloadLibrary()` injectable - pass it as a parameter or make it a method on the context object so tests can mock it
- [ ] Make `parse()` and `loadPlaylists()` injectable - allow passing mock implementations in the factory for tests
- [ ] Export `createApp` and types from `src/index.tsx` for test imports
- [ ] Create test utility to build mock app - use `createApp()` with in-memory Maps and empty Fuse instances in integration tests

## Target Structure

```
src/
├── index.tsx        # Export createApp(), types - no side effects
├── server.tsx       # Entry point: calls createApp(), reloadLibrary(), listen()
├── lib/
│   └── fuse.ts      # Keep as-is or export factory function
```

## Example Factory Signature

```typescript
interface AppContext {
  db: {
    artists: Map<string, Artist>
    albums: Map<string, Album>
    tracks: Map<string, Track>
    artAssets: Map<string, ArtAsset>
    audioAssets: Map<string, AudioAsset>
    playlists: Map<string, Playlist>
  }
  fuseInstances: {
    artists: Fuse<Artist>
    albums: Fuse<Album>
    playlists: Fuse<Playlist>
  }
  sources: Source[]
  reloadLibrary?: () => Promise<void>
}

function createApp(context: AppContext): Elysia
```
