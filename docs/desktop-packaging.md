# Desktop Packaging Options

Mixtape is a client-server app: a Bun/Elysia backend serves a React SPA + music files. On desktop, we need to:

- Start the server process on login and keep it running in the background
- Surface the UI (browser tab or dedicated window)
- Handle library scanning, metadata enrichment, and streaming as background jobs

The server process and its background jobs are unaffected by the packaging choice — only the lifecycle management and UI surface change.

---

## Preferred: Compiled Binary + OS Service

`bun build --compile` produces a standalone binary bundling Bun runtime + server code. The OS service manager (systemd, launchd) keeps it running in the background. User opens `http://localhost:3000` in their browser.

**Steps:**

1. Add build script: `bun build --compile src/index.tsx --outfile dist/mixtape-server`
   - Binary is ~50MB (includes Bun runtime, Elysia, PGlite, Sharp, all deps)
   - Vite-built frontend (`dist/`) must ship alongside; server serves it via `staticPlugin`
   - Build both in CI and bundle together: `mixtape-server` + `dist/` + install script

2. Provide install script for Linux (`install.sh`):
   - Copies binary to `/usr/local/bin/mixtape-server`
   - Copies `dist/` to `/opt/mixtape/`
   - Creates systemd user service at `~/.config/systemd/user/mixtape.service`:

     ```
     [Unit]
     Description=Mixtape Music Server

     [Service]
     Type=simple
     ExecStart=/usr/local/bin/mixtape-server
     Restart=on-failure
     RestartSec=5
     Environment=NODE_ENV=production
     Environment=MUSIC_PATH=/home/user/Music
     Environment=DATA_PATH=/home/user/.mixtape

     [Install]
     WantedBy=default.target
     ```

   - Runs `systemctl --user enable --now mixtape`

3. Provide install script for macOS (`install.sh`):
   - Copies binary to `/usr/local/bin/mixtape-server`
   - Creates launchd plist at `~/Library/LaunchAgents/com.mixtape.server.plist`
   - Loads with `launchctl load ~/Library/LaunchAgents/com.mixtape.server.plist`

4. Provide a `.desktop` file (Linux) that opens `http://localhost:3000`:

   ```
   [Desktop Entry]
   Name=Mixtape
   Exec=xdg-open http://localhost:3000
   Type=Link
   Icon=mixtape
   ```

5. Version check on startup (optional):
   - Server pings `https://api.github.com/repos/Sturlen/mixtape-music-player/releases/latest`
   - If newer version found, show dismissible banner in the UI
   - User downloads new binary + `dist/` manually and re-runs install script

**Tradeoffs:**

| Pro | Con |
|-----|-----|
| Zero new framework dependencies | No system tray icon |
| Binary is standalone (Bun runtime bundled) | Manual update process |
| Existing web UI unchanged | "Install" = terminal script |
| OS service manager handles restart | No dedicated desktop window |
| Easy CI pipeline (single `bun build --compile`) | |

---

## Future Option: Tauri Sidecar

A Tauri app (Rust binary, ~5MB) that spawns the Bun server as a sidecar process, provides a system tray icon, and opens a webview window pointed at `localhost:3000`. Tauri manages server lifecycle and provides built-in auto-updates.

**Steps:**

1. Set up Tauri project in repo root:
   ```bash
   bunx create-tauri-app mixtape-desktop
   ```

2. Configure sidecar in `tauri.conf.json`:
   - Path to compiled Bun binary (`mixtape-server`)
   - Arguments: `["--port", "3000"]`
   - Permission: allow HTTP to `localhost:3000`

3. Build system tray with commands:
   - **Open Mixtape** — opens webview window (or system browser)
   - **Restart Server** — kills and restarts sidecar
   - **Quit** — kills sidecar and exits

4. Webview window:
   - Points to `http://localhost:3000`
   - If server not ready, show loading state and poll until 200
   - Disable navigation (stay within app)

5. Auto-updater via `tauri-plugin-updater`:
   - Host `latest.json` on GitHub Releases or a simple endpoint
   - App checks on launch, downloads and applies update on consent

**Tradeoffs:**

| Pro | Con |
|-----|-----|
| System tray integration | Requires Rust toolchain |
| Built-in auto-update mechanism | Sidecar lifecycle complexity |
| Dedicated app window | Need to maintain Tauri project alongside |
| Small binary overhead | Webview != full browser (some edge cases) |
| Polished desktop feel | |
