# Test Suite Plan

## Overview

Create a comprehensive test suite for the Mixtape Music Player to ensure no regressions during refactoring.

## Testing Strategy

### Unit Tests

- Pure functions and utilities with no external dependencies
- Fast to run, no setup required

### Integration Tests

- Test API endpoints with **in-memory test data**
- Avoid requiring actual music files on disk
- Each test sets up fresh mock data

## Test Execution

```bash
# Run all tests
bun test

# Run tests in watch mode (reruns on file changes)
bun test --watch

# Run specific test file
bun test tests/unit/math.test.ts

# Run specific test by name (useful for debugging)
bun test "clamp value within range"

# Run tests matching a pattern
bun test "unit"
bun test "integration"

# Run with verbose output
bun test --verbose
```

### Debugging Individual Tests

When debugging a specific test:

1. **Run single test file**: `bun test tests/integration/player.test.ts`
2. **Run single test**: `bun test "POST /api/player with valid trackId"`
3. **Watch mode for one file**: `bun test --watch tests/unit/math.test.ts`

Use `test.only()` temporarily in a test file to run a single test:

```typescript
test.only("single test", () => { ... })
```

---

## TDD Workflow (Red-Green-Refactor)

For each test, follow this process:

### Step 1: Write Test to Fail

1. Write the test with expected assertions
2. Run it - it should FAIL (red)
3. Verify the failure message is clear

### Step 2: Write Code to Pass

1. Implement the minimum code to make test pass
2. Run the test again - it should PASS (green)
3. If it fails, fix the implementation, not the test

### Step 3: Verify & Refactor

1. Run all tests to ensure no regressions
2. Refactor code if needed while keeping tests green
3. Remove any `test.only()` or `test.skip()` helpers

### Example Workflow

```bash
# 1. Write test, verify it fails
$ bun test "clamp"
✗ clamp value within range
  Expected: 0.5
  Received: undefined

# 2. Implement fix, verify it passes
$ bun test "clamp"
✓ clamp value within range

# 3. Run full suite to ensure no regressions
$ bun test
✓ all tests pass
```

## Verification Approach

1. All tests must pass before declaring refactor complete
2. Each test assertion documents expected behavior
3. Tests cover both happy path and error conditions

---

## Implementation Tasks

> **IMPORTANT**: Follow TDD workflow for each test:
>
> 1. Write test, verify it FAILS (red)
> 2. Implement code, verify it PASSES (green)
> 3. Run full suite to verify no regressions

### Phase 1: Setup

- [ ] **1.1** Add test script to package.json
- [ ] **1.2** Create test utilities/helpers (`tests/testUtils.ts`)

### Phase 2: Unit Tests

#### 2.1 Utility Functions (`tests/unit/utils.test.ts`)

- [ ] **2.1.1** Test `cn()` - class name merging
- [ ] **2.1.2** Test `raise()` - error throwing

#### 2.2 Math Utilities (`tests/unit/math.test.ts`)

- [ ] **2.2.1** Test `clamp()` - value clamping

#### 2.3 Track Sorting (`tests/unit/trackSorting.test.ts`)

- [ ] **2.3.1** Test `compareTracksByNumberName()` - track sorting logic

### Phase 3: Integration Tests

#### 3.1 Stats Endpoint (`tests/integration/stats.test.ts`)

- [ ] **3.1.1** GET /api/stats returns correct counts

#### 3.2 Artist Endpoints (`tests/integration/artists.test.ts`)

- [ ] **3.2.1** GET /api/artists returns all artists sorted alphabetically
- [ ] **3.2.2** GET /api/artists with search query returns filtered results
- [ ] **3.2.3** GET /api/artists/:id returns artist with albums
- [ ] **3.2.4** GET /api/artists/:id returns 404 for unknown artist

#### 3.3 Album Endpoints (`tests/integration/albums.test.ts`)

- [ ] **3.3.1** GET /api/albums returns all albums sorted alphabetically
- [ ] **3.3.2** GET /api/albums with search query returns filtered results
- [ ] **3.3.3** GET /api/albums/:id returns album with tracks
- [ ] **3.3.4** GET /api/albums/:id returns 404 for unknown album

#### 3.4 Track Endpoints (`tests/integration/tracks.test.ts`)

- [ ] **3.4.1** GET /api/tracks returns all tracks
- [ ] **3.4.2** GET /api/tracks/:id returns single track
- [ ] **3.4.3** GET /api/tracks/:id returns 404 for unknown track

#### 3.5 Playlist Endpoints (`tests/integration/playlists.test.ts`)

- [ ] **3.5.1** GET /api/playlists returns all playlists sorted alphabetically
- [ ] **3.5.2** GET /api/playlists with search query returns filtered results
- [ ] **3.5.3** GET /api/playlists/:id returns single playlist
- [ ] **3.5.4** GET /api/playlists/:id returns 404 for unknown playlist
- [ ] **3.5.5** POST /api/playlists creates new playlist when enabled
- [ ] **3.5.6** POST /api/playlists throws when disabled
- [ ] **3.5.7** PUT /api/playlists/:id updates playlist
- [ ] **3.5.8** DELETE /api/playlists/:id removes playlist

#### 3.6 Player Endpoints (`tests/integration/player.test.ts`)

- [ ] **3.6.1** POST /api/player with valid trackId returns playback URL
- [ ] **3.6.2** POST /api/player with missing trackId returns 400
- [ ] **3.6.3** POST /api/player with unknown trackId returns 404
- [ ] **3.6.4** POST /api/playAlbum/:id returns album with sorted tracks
- [ ] **3.6.5** POST /api/playAlbum/:id returns 404 for unknown album
- [ ] **3.6.6** POST /api/playPlaylist/:id returns playlist with full track objects
- [ ] **3.6.7** POST /api/playPlaylist/:id returns 404 for unknown playlist

#### 3.7 File Endpoints (`tests/integration/files.test.ts`)

- [ ] **3.7.1** GET /api/files/albumart/:id serves image file
- [ ] **3.7.2** GET /api/files/albumart/:id returns 404 for unknown album
- [ ] **3.7.3** GET /api/files/artistart/:id serves image file
- [ ] **3.7.4** GET /api/files/artistart/:id returns 404 for unknown artist

#### 3.8 Library Endpoints (`tests/integration/library.test.ts`)

- [ ] **3.8.1** POST /api/libary/reload succeeds

### Phase 4: Verification

- [ ] **4.1** Run full test suite and verify all pass
- [ ] **4.2** Run typecheck to ensure no type errors

---

## Test File Structure

```
tests/
├── testUtils.ts              # Shared mock factories
├── unit/
│   ├── utils.test.ts
│   ├── math.test.ts
│   └── trackSorting.test.ts
└── integration/
    ├── stats.test.ts
    ├── artists.test.ts
    ├── albums.test.ts
    ├── tracks.test.ts
    ├── playlists.test.ts
    ├── player.test.ts
    ├── files.test.ts
    └── library.test.ts
```

---

## Important Notes

1. **MIXTAPES_ENABLED**: Some playlist tests depend on this env variable - tests will mock or set environment appropriately

2. **FFmpeg**: Tests should not require FFmpeg - mock or bypass conversion logic

3. **Existing Test**: `tests/newPlaylistParser.test.ts` already exists - keep it

4. **Isolation**: Each test file creates its own app instance to avoid state pollution
