# Changelog

Notable changes. Expect proper version numbers when it's actually close to a release version.

## v0.0.0 [19-11-2025]

### Added

- Changelog file
- (optional) automatic audio file conversion on playback with ffmpeg. (Not recommended right now, since it's way too slow on most servers)

## v0.0.1 [13-12-2025]

### Added

- **Mixtape/Playlist Feature**: Full playlist management system with the following capabilities:
  - Create, read, update, and delete mixtapes
  - Add tracks to existing mixtapes from album pages
  - Browse and search mixtapes in a dedicated UI
  - YAML-based storage for mixtape data in `data/playlists/`
  - "Add to Mix" buttons on track listings for easy mixtape building
  - Mixtape detail pages with track listings and playback controls

### Security & Configuration

- **MIXTAPES_ENABLED Feature Flag**: New environment variable to control mixtape functionality
  - **Purpose**: Prevents unauthorized file creation on public demo deployments
  - **Default**: `false` (disabled for security)
  - **Usage**: Set `MIXTAPES_ENABLED=true` to enable mixtape creation and modification
  - **Impact**: When disabled, mixtape parsing, creation, modification, and deletion are blocked
  - **Rationale**: Public demos could become moderation nightmares with random user-created files

### Technical Details

- Mixtape parsing is completely skipped when `MIXTAPES_ENABLED=false`
- All mixtape-related API endpoints return 403 Forbidden when feature is disabled
- Existing mixtapes remain accessible for reading but cannot be modified when disabled
- Feature flag provides a simple security boundary for shared deployments
