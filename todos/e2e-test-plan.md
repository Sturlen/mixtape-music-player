# E2E Test Plan for Mixtape Music Player

## Overview

End-to-end tests that run against a fully running server instance with real HTTP requests. No mocking, no refactoring - test the app as-is.

## Constraints

- **Run app as-is** - no server factory refactoring
- **Read-only tests** - no state mutations
- **No database reset** - app reads files from disk, not a database
- **Demo music only** - inject env vars to point to `demo-music/`
- **FFmpeg disabled** - `USE_FFMPEG=0`
- **Real test data** - `demo-music/` has actual files

## Implementation Plan

### Phase 1: Test Infrastructure

- [ ] **1.1** Create `tests/e2e/testServer.ts`
  - Start server as subprocess with custom env vars
  - Use random port to avoid conflicts
  - Provide base URL to tests
  - Clean shutdown after tests

- [ ] **1.2** Create `tests/e2e/testClient.ts`
  - Simple `fetch` wrapper with base URL
  - Response type helpers

- [ ] **1.3** Create `tests/e2e/fixtures.ts`
  - Document known artists/albums/tracks from demo-music
  - Helper functions to find test data by name/pattern

### Phase 2: E2E Test Files

#### 2.1 Stats Endpoint (`tests/e2e/stats.test.ts`)

- [ ] **2.1.1** GET /api/stats returns counts matching demo library

#### 2.2 Artist Endpoints (`tests/e2e/artists.test.ts`)

- [ ] **2.2.1** GET /api/artists returns all artists sorted alphabetically
- [ ] **2.2.2** GET /api/artists?q=<query> returns fuzzy search results
- [ ] **2.2.3** GET /api/artists/:id returns artist with albums
- [ ] **2.2.4** GET /api/artists/:id returns empty object for unknown artist

#### 2.3 Album Endpoints (`tests/e2e/albums.test.ts`)

- [ ] **2.3.1** GET /api/albums returns all albums sorted alphabetically
- [ ] **2.3.2** GET /api/albums?q=<query> returns fuzzy search results
- [ ] **2.3.3** GET /api/albums/:id returns album with sorted tracks
- [ ] **2.3.4** GET /api/albums/:id returns empty object for unknown album

#### 2.4 Track Endpoints (`tests/e2e/tracks.test.ts`)

- [ ] **2.4.1** GET /api/tracks returns all tracks
- [ ] **2.4.2** GET /api/tracks/:id returns single track
- [ ] **2.4.3** GET /api/tracks/:id returns undefined for unknown track

#### 2.5 Playlist Endpoints (`tests/e2e/playlists.test.ts`)

- [ ] **2.5.1** GET /api/playlists returns all playlists sorted alphabetically
- [ ] **2.5.2** GET /api/playlists?q=<query> returns fuzzy search results
- [ ] **2.5.3** GET /api/playlists/:id returns single playlist
- [ ] **2.5.4** GET /api/playlists/:id returns 404 for unknown playlist

#### 2.6 Player Endpoints (`tests/e2e/player.test.ts`)

- [ ] **2.6.1** POST /api/player with valid trackId returns playback URL
- [ ] **2.6.2** POST /api/player with missing trackId returns 400
- [ ] **2.6.3** POST /api/player with unknown trackId returns 404
- [ ] **2.6.4** POST /api/playAlbum/:id returns album with sorted tracks
- [ ] **2.6.5** POST /api/playAlbum/:id returns 404 for unknown album
- [ ] **2.6.6** POST /api/playPlaylist/:id returns playlist with track objects
- [ ] **2.6.7** POST /api/playPlaylist/:id returns 404 for unknown playlist

#### 2.7 File Endpoints (`tests/e2e/files.test.ts`)

- [ ] **2.7.1** GET /api/files/albumart/:id serves image with correct content-type
- [ ] **2.7.2** GET /api/files/albumart/:id returns 404 for unknown album
- [ ] **2.7.3** GET /api/files/artistart/:id serves image with correct content-type
- [ ] **2.7.4** GET /api/files/artistart/:id returns 404 for unknown artist
- [ ] **2.7.5** GET /api/files/track/:id serves audio file
- [ ] **2.7.6** GET /api/assets/:id serves audio asset

### Phase 3: Test Scripts

- [ ] **3.1** Add `test:e2e` script to package.json
- [ ] **3.2** Add `test:e2e:watch` for development

```json
{
  "scripts": {
    "test:e2e": "bun test tests/e2e",
    "test:e2e:watch": "bun test --watch tests/e2e"
  }
}
```

## File Structure

```
tests/
├── e2e/
│   ├── testServer.ts       # Server subprocess management
│   ├── testClient.ts       # HTTP fetch helpers
│   ├── fixtures.ts         # Known test data helpers
│   ├── stats.test.ts
│   ├── artists.test.ts
│   ├── albums.test.ts
│   ├── tracks.test.ts
│   ├── playlists.test.ts
│   ├── player.test.ts
│   └── files.test.ts
└── newPlaylistParser.test.ts  # Keep existing
```

## Server Startup Strategy

Start server as a subprocess with injected environment.

**Important:** Do NOT spread `process.env` - this prevents `.env.local` from leaking into tests. Set only required env vars explicitly:

```typescript
// tests/e2e/testServer.ts
import { spawn } from "bun"

let serverProcess: ReturnType<typeof spawn> | null = null
let baseUrl = ""

export async function startServer() {
  if (serverProcess) return baseUrl

  const port = Math.floor(Math.random() * 10000) + 30000 // Random port 30000-40000

  serverProcess = spawn({
    // --no-env-file disables Bun's automatic .env/.env.local loading
    cmd: ["bun", "--no-env-file", "src/index.tsx"],
    env: {
      // Explicit env only - control exactly which vars the test server sees
      NODE_ENV: "test",
      PORT: String(port),
      MUSIC_PATH: "./demo-music",
      DATA_PATH: "./data",
      USE_FFMPEG: "0",
    },
    stdout: "pipe",
    stderr: "pipe",
  })

  // Wait for server to be ready
  await waitForServer(port)

  baseUrl = `http://localhost:${port}`
  return baseUrl
}

export async function stopServer() {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
}

export function getBaseUrl() {
  return baseUrl
}

async function waitForServer(port: number, timeout = 10000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`http://localhost:${port}/api/stats`)
      if (res.ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error("Server failed to start")
}
```

## Test File Example

```typescript
// tests/e2e/artists.test.ts
import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { startServer, stopServer, getBaseUrl } from "./testServer"

describe("Artist Endpoints", () => {
  beforeAll(async () => {
    await startServer()
  })

  afterAll(async () => {
    await stopServer()
  })

  test("GET /api/artists returns all artists sorted alphabetically", async () => {
    const res = await fetch(`${getBaseUrl()}/api/artists`)
    const artists = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(artists)).toBe(true)

    // Verify alphabetical sort
    for (let i = 1; i < artists.length; i++) {
      expect(
        artists[i - 1].name.localeCompare(artists[i].name),
      ).toBeLessThanOrEqual(0)
    }
  })
})
```

## Estimated Effort

| Phase                        | Effort    |
| ---------------------------- | --------- |
| Phase 1: Test infrastructure | 2-3 hours |
| Phase 2: E2E test files      | 4-6 hours |
| Phase 3: Scripts             | 15 min    |

**Total: 6-10 hours**

## Next Steps

1. Create `tests/e2e/testServer.ts` with server subprocess management
2. Create `tests/e2e/testClient.ts` with fetch helpers
3. Create `tests/e2e/fixtures.ts` with known demo-music data
4. Write first test file (`stats.test.ts`) to validate infrastructure
5. Expand test coverage to other endpoints
