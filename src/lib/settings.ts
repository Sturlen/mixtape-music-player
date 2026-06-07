export type SettingCategory = "appearance" | "playback" | "server"
export type SettingScope = "client" | "server"

export interface SettingDef<T = unknown> {
  key: string
  label: string
  description: string
  type: "select" | "slider" | "toggle"
  category: SettingCategory
  scope: SettingScope
  defaultValue: T
  options?: { label: string; value: unknown }[]
  min?: number
  max?: number
  step?: number
}

export const SETTINGS: SettingDef[] = [
  {
    key: "theme",
    label: "Theme",
    description: "Switch between light, dark, or follow system preference",
    type: "select",
    category: "appearance",
    scope: "client",
    defaultValue: "system",
    options: [
      { label: "System", value: "system" },
      { label: "Light", value: "light" },
      { label: "Dark", value: "dark" },
    ],
  },
  {
    key: "playback_speed",
    label: "Playback Speed",
    description: "Adjust audio playback speed",
    type: "slider",
    category: "playback",
    scope: "client",
    defaultValue: 1,
    min: 0.5,
    max: 2,
    step: 0.05,
  },
  {
    key: "ffmpeg_enabled",
    label: "FFmpeg Audio Conversion",
    description: "Enable on-the-fly audio transcoding via FFmpeg.",
    type: "toggle",
    category: "server",
    scope: "server",
    defaultValue: false,
  },
]

export const CATEGORIES: { id: SettingCategory; label: string }[] = [
  { id: "appearance", label: "Appearance" },
  { id: "playback", label: "Playback" },
  { id: "server", label: "Server" },
]

export const SERVER_SETTING_KEYS = SETTINGS.filter(
  (s) => s.scope === "server",
).map((s) => s.key)
