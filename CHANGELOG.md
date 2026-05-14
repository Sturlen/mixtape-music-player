# Changelog

Notable changes. Expect proper version numbers when it's actually close to a release version.


## v0.3.0 [14-05-2026]

### Added

- **Persistent database**: PGlite + Drizzle ORM replaces in-memory Maps. Library data survives restarts. File-based persistence at `DATA_PATH/pglite`. Migrations auto-apply on startup.
- **Album art color extraction**: Dominant color and readable text color extracted from cover art via colorthief MMCQ. Used as tile background before image loads, and on cassette body accent color.
- **SSE progress endpoint**: `/api/library/progress` streams enrichment status. Frontend auto-refreshes via EventSource as tracks appear.
- **Art assets system**: Polymorphic `art_assets` table with entity-based FK (`entity_id + entity_type` + `role`). Supports multiple art assets per album/artist (cover, portrait, back, other). Full dimensions and color info stored at insert time.
- **File-based asset IDs**: Audio and art asset IDs derive from content hash (first 64KB) rather than file path. Survives file renames.

### Changed

- **Library persistence**: Database stores all library state. No more clear-on-restart. New files are discovered incrementally on each scan.
- **Artist/album art model**: `image_path` and `primary_color` fields removed from artists/albums tables. All art lives in `art_assets`.
- **Album art URLs**: Computed at response time from album ID (`/api/files/albumart/{id}`) rather than stored on the row.
- **Artist grouping priority**: Folder name now beats album_artist tag. File in "2 Mello" folder groups under "2 Mello" even if metadata says "2 Mello and Million Sunday".
- **Cassette component**: SVG converted to React component. Orange accent parts use album art dominant color.

### Fixed

- **Playlist CRUD**: `playlistStore` now populated from database on startup.
- **TOCTOU race**: Artist/album upsert uses `INSERT … ON CONFLICT DO NOTHING RETURNING` for atomicity under concurrent enrichment.
- **Artists.name unique constraint**: Removed — two artists can share a name.
- **ArtImage**: Background color shows before image loads. Fallback label (name on muted bg) shows on error. Images lazy-load with `loading="lazy"` and preserve aspect ratio via `object-contain`.
- **Metadata enrichment**: No longer clears database on restart. Existing tracks preserved, new ones added incrementally.

## v0.2.0 [14-05-2026]

### Added

- **Track duration display** on album and playlist track lists.
- **Background metadata enrichment**: Library loads instantly. Duration, artist, album, title parsed from audio files with limited concurrency. Tracks appear gradually.
- **Flat file library support**: Artist/album/track names sourced from audio metadata tags, not directory structure. Falls back to folder names, then to "Unknown".
- **Smart artist grouping**: Featuring artists no longer split the library. Priority: album artist tag → folder name → first name before comma → "Unknown Artist".
- **ID3v2.2 tag support**: Mediabunny patched for iTunes-era files. ([PR submitted](https://github.com/Vanilagy/mediabunny/pull/381) and merged on their repo. awaiting next version )

### Changed

- **Library system**: New `Library` class with upsert semantics. Parse split into fast filesystem scan + background metadata enrichment.
- **Metadata providers**: Extracted `AudioMetadataProvider` interface. FfprobeMetadataProvider (default, faster) and MediabunnyMetadataProvider (fallback). Factory probes for ffprobe.

### Fixed

- **Grafana OTLP telemetry**: Auth and endpoint URL now constructs correctly.

## v0.1.0 [11-01-2026]

### Added

- Data folder. All files that MIXTAPE manage, like playlists, will be stored in here. See ENV.

- **Mixtape/Playlist Feature**: Full playlist management system with the following capabilities:
  - Create, read, update, and delete mixtapes
  - Add tracks to existing mixtapes from album pages
  - Browse and search mixtapes in a dedicated UI
  - YAML-based storage for mixtape data in `data/playlists/`
  - "Add to Mix" buttons on track listings for easy mixtape building
  - Mixtape detail pages with track listings and playback controls

### Security & Configuration

- **MIXTAPES_ENABLED Feature Flag**: New environment variable to control mixtape functionality
  - **Purpose**: Defaults to false to stop unauthorized file creation on public demo deployments
  - **Usage**: Set `MIXTAPES_ENABLED=true` to enable mixtape creation and modification
  - **Impact**: When disabled, mixtape parsing, creation, modification, and deletion are blocked

### Technical Details

- Mixtape parsing is completely skipped when `MIXTAPES_ENABLED=false`
- All mixtape-related API endpoints return 403 Forbidden when feature is disabled
- Existing mixtapes remain accessible for reading but cannot be modified when disabled
- Feature flag provides a simple security boundary for shared deployments

## v0.0.0 [19-11-2025]

### Added

- Changelog file
- (optional) automatic audio file conversion on playback with ffmpeg. (Not recommended right now, since it's way too slow on most servers)
