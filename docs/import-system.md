# Import System

A per-source inbox folder where loose audio files are dropped, analyzed by metadata, and organized into the proper `Artist/Album/` library hierarchy.

---

## Design

### Config
- Each library source gets an `import_path` field (stored in `sources` DB table)
- Default: `<source_root>/.imports/`
- Configurable in admin UI via library source management

### Trigger
- Manual: "Process imports" button in admin dashboard, or `POST /api/sources/:id/process-imports`
- No real-time filesystem watching — media files typically live on network drives (NAS, Samba, NFS), making inotify/fsevents unreliable. This is a fundamental constraint of the project.

### Pipeline

```
Read metadata (ffprobe/mediabunny)
  ├─ Valid metadata ──→ Determine artist/album/track
  │                      ├─ Resolve/create Artist directory under source root
  │                      ├─ Resolve/create Album directory
  │                      ├─ Extract embedded cover art → cover.jpg
  │                      ├─ Move file → Artist/Album/NN - Track Title.ext
  │                      └─ On completion: auto-trigger library scan for source root
  │
  └─ Invalid/corrupt ──→ Leave file in inbox
                         └─ Mark error (file name, reason, timestamp)
```

### Artist Matching
- Exact name match for now. If artist doesn't exist, create it.
- Future: artist aliases table + fuzzy matching via Fuse.js so "Beatles" and "The Beatles" can be linked.

### File Naming
- Pattern: `{trackNumber} - {title}.{ext}`
- No track number: `{title}.{ext}`
- Title sanitized: strip illegal filesystem chars, collapse whitespace

### Album Art
- Extract embedded image (APIC frame for MP3, METADATA_BLOCK_PICTURE for FLAC)
- Write as `cover.jpg` in the album directory
- If `cover.jpg` already exists, skip (don't overwrite existing art)

### Error Handling
- Files without readable metadata → remain in inbox
- Files with move failures (permissions, disk full, name conflict) → remain in inbox
- Dashboard shows error list per source: file path, error reason, timestamp
- User can fix the issue and re-process, or manually remove the file

### Relationship to Existing Scanner
- **Library scanner** (existing): folder walk, directory names as fallback, read-only
- **Import processor** (new): metadata-first, moves files, writes art, write-enabled
- Import processor organizes files; the library scanner indexes them on next scan (auto-triggered after import completes)

---

## Implementation Plan

### Phase 1: Schema & Types

- [ ] **1a.** Add `import_path` column to `sources` table in `src/db/schema.ts` — nullable text, defaults to `<root_path>/.imports` when null
- [ ] **1b.** Generate & apply migration
- [ ] **1c.** Add `ImportJobStatus` type: `Record<string, ImportFileResult>` where key is file path, value is success or error detail
- [ ] **1d.** Add `ImportFileResult` type: `{ status: "ok" | "error"; error?: string; movedTo?: string }`
- [ ] **1e.** Add `SourceImportPath` to settings/env if needed — fallback path when source doesn't override

### Phase 2: Scanner — Single File Import

New module: `src/server/importer.ts`

- [ ] **2a.** `analyzeFile(filePath)` — read audio metadata via existing ffprobe/mediabunny providers. Returns `{ artist, album, title, trackNumber, ext, hasEmbeddedArt, error? }` or `null`
- [ ] **2b.** `resolveArtistPath(sourceRoot, artistName)` — sanitize artist name, check if artist directory exists, return path
- [ ] **2c.** `resolveAlbumPath(artistPath, albumName)` — sanitize album name, check/create album directory, return path
- [ ] **2d.** `extractCoverArt(filePath, albumPath)` — extract embedded art to `albumPath/cover.jpg`, skip if file exists
- [ ] **2e.** `moveFile(filePath, albumPath, trackNumber, title)` — rename and move to `Album/NN - Title.ext`. Handle cross-filesystem moves (copy + delete on different mounts)
- [ ] **2f.** `processFile(filePath, source)` — orchestrates 2a→2e for a single file. Returns `ImportFileResult`

### Phase 3: Import Job Runner

- [ ] **3a.** `processSourceImports(sourceId)` — scan `import_path` for audio files, call `processFile()` on each, collect results
- [ ] **3b.** After all files processed, auto-trigger library scan for the source root (call existing `parse()` / `reloadLibrary()` or source-scoped scan)
- [ ] **3c.** Concurrency: process files with `pLimit` (same as metadata enrichment), default 4
- [ ] **3d.** Error resilience: one file failure doesn't stop the batch; errors collected and reported

### Phase 4: API Endpoint

- [ ] **4a.** `POST /api/libraries/:id/process-imports` — triggers `processSourceImports()`, returns job summary `{ total, processed, errors: ImportFileResult[] }`
- [ ] **4b.** Authentication: admin-only (requires JWT + admin role)
- [ ] **4c.** Progress: optionally stream progress via SSE (similar to existing `/api/library/progress`) for the dashboard

### Phase 5: Admin Dashboard

- [ ] **5a.** Add "Import" tab to library source detail/edit view
- [ ] **5b.** Import folder path display + edit field
- [ ] **5c.** "Process imports" button — triggers `POST /api/libraries/:id/process-imports`
- [ ] **5d.** Results display: count processed, list errors with file paths and reasons
- [ ] **5e.** Import path example/help text: "Drop .mp3, .flac, .m4a files here. Files must have metadata tags to be organized automatically."

### Phase 6: Verify

- [ ] **6a.** Manual test: drop a well-tagged MP3 into `.imports/`, run import, verify it moves to Artist/Album/ with correct naming and art
- [ ] **6b.** Manual test: drop a file without tags, verify it stays in inbox with error
- [ ] **6c.** Manual test: drop file for existing artist/album, verify it merges into existing directory
- [ ] **6d.** Manual test: cross-filesystem move (import on different mount than library), verify copy+delete fallback
- [ ] **6e.** Manual test: run import on an empty inbox, verify no crash
- [ ] **6f.** Auto-scan after import: verify new tracks appear in library immediately after import completes
