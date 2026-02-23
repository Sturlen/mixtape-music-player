# Mixtape Music Player - Agent Guidelines

## Code Style

- DO NOT use unnecessary type hints. Let typescript inference do it's job.
- Avoid "Any" type.
- DO use absolute imports.

## Project Architecture

- **Backend:** Elysia (Bun-based web framework) with REST API
- **Frontend:** React 19 with TypeScript, TanStack Router, and TanStack Query
- **Runtime:** Bun (JavaScript runtime)
- **Styling:** Tailwind CSS with Radix UI components
- **State Management:** Zustand for player state, React Query for server state
- **File Structure:**
  - `/src/index.tsx` - Main Elysia server with API endpoints
  - `/src/frontend.tsx` - React app entry point
  - `/src/client/` - Frontend components and router
  - `/src/routes/` - File-based routing with TanStack Router
  - `/src/lib/` - Shared utilities and types
  - `/src/shared/env.ts` - Environment configuration

## Development Commands

- `bun dev` - Start development server with hot reload
- `bun run build` - Build for production
- `bun run start` - Run production server
- `bun run check` - Run ESLint
- `bun run format` - Run Prettier
- `bun run generate-routes` - Generate TanStack Router routes
- `bun run watch-routes` - Watch for route changes


## Code Quality Verification

**IMPORTANT:** After making any code changes, always run full checking to verify code correctness:

```bash
bun run check
```

This command validates TypeScript types and catches:

- Type errors and mismatches
- Missing imports/exports
- Incorrect prop types
- Interface violations

Never commit changes without ensuring `bun run typecheck` passes without errors.

## Key Technologies & Patterns

- **API Design:** RESTful endpoints with OpenAPI documentation
- **Data Storage:** In-memory Maps for artists, albums, tracks, artAssets, audioAssets, playlists
- **File Handling:** Sharp for images, FFmpeg for audio conversion
- **Search:** Fuse.js for fuzzy search across artists, albums, playlists
- **Audio:** HTML5 audio with media session API
- **Routing:** File-based routing with TanStack Router
- **Components:** Radix UI primitives with custom styling

## Music Library Structure

The app expects music organized as:

```
Media/
├─ Artist Name/
│  ├─ artist.jpg
│  ├─ Album Name/
│  │  ├─ 01 - Track Name.mp3
│  │  ├─ cover.jpg
│  │  └─ ...
│  └─ Another Album/
└─ Another Artist/
```

## Environment Configuration

- `MUSIC_PATH` - Primary music library path (default: "./demo-music/")
- `MUSIC2_PATH` - Secondary music library path (optional)
- `PORT` - Server port (default: 3000)
- `USE_FFMPEG` - Enable FFmpeg audio conversion (default: false)

## Data Models

- **Source:** Music source configuration with id, name, rootPath
- **Track:** id, name, albumId, playtimeSeconds, trackNumber, path, artURL
- **Album:** id, name, artistId, imagePath, imageURL, artAssetId
- **Artist:** id, name, imagePath, imageURL, artAssetId
- **Playlist:** name, id, tracks array, imageUrl
- **AssetBase:** id, parentId, path, name, filetype, fileExt
- **ArtAsset:** AssetBase + width, height
- **AudioAsset:** AssetBase + duration

## API Endpoints

- `GET /api/artists` - List artists with optional search
- `GET /api/artists/:artistId` - Get artist with albums
- `GET /api/albums` - List albums with optional search
- `GET /api/albums/:albumId` - Get album with tracks
- `GET /api/tracks` - List all tracks
- `GET /api/playlists` - List playlists with optional search
- `GET /api/files/albumart/:albumId` - Serve album art
- `GET /api/files/artistart/:artistId` - Serve artist art
- `GET /api/files/track/:trackId` - Serve audio file
- `GET /api/assets/:assetId` - Serve audio asset with optional FFmpeg conversion
- `POST /api/player` - Get playback URL for track
- `POST /api/playAlbum/:albumId` - Play album
- `POST /api/playPlaylist/:playlistId` - Play playlist
- `POST /api/libary/reload` - Reload music library

## Common Tasks

- **Adding new API endpoints:** Edit `/src/index.tsx`
- **Adding new routes:** Create files in `/src/routes/`
- **Adding components:** Place in `/src/client/components/`
- **Environment changes:** Edit `/src/shared/env.ts`
- **Type definitions:** Edit `/src/lib/types.ts`

## Modular Route Pattern

When extracting routes to separate files, maintain context access:

```typescript
interface RouteContext {
  db: {
    tracks: Map<string, Track>
    playlists: Map<string, Playlist>
    artists: Map<string, Artist>
    albums: Map<string, Album>
  }
  fuseInstances: {
    fuse_playlists: Fuse<Playlist>
    fuse_artists: Fuse<Artist>
    fuse_albums: Fuse<Album>
  }
}

export function createRoutes(context: RouteContext) {
  return new Elysia({ prefix: "/api" })
  // routes with full context access
}
```

Usage in main app:

```typescript
import { createRoutes } from "./routes"

const app = new Elysia()
  .use(createRoutes({ db, fuseInstances }))
  .listen(env.PORT)
```

## Elysia Error Handling

Use proper Elysia error handling patterns:

```typescript
// ✅ Correct - Use status() function
.post("/api/resource", async ({ body, status }) => {
  if (!env.FEATURE_ENABLED) {
    throw status(403, "Feature disabled")
  }
  // ... rest of handler
})

// ❌ Incorrect - Don't mix set.status with throw
.post("/api/resource", async ({ body, set }) => {
  if (!env.FEATURE_ENABLED) {
    set.status = 403
    throw new Error("Feature disabled") // This causes type issues
  }
})
```

