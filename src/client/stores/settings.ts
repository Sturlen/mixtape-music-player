import { create } from "zustand"
import { persist } from "zustand/middleware"
import { SETTINGS } from "@/lib/settings"

interface SettingsState {
  values: Record<string, unknown>
  setSetting: (key: string, value: unknown) => void
  resetAll: () => void
}

function getDefaults() {
  return Object.fromEntries(
    SETTINGS.filter((s) => s.scope === "client").map((s) => [
      s.key,
      s.defaultValue,
    ]),
  )
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      values: getDefaults(),
      setSetting: (key, value) =>
        set((state) => ({ values: { ...state.values, [key]: value } })),
      resetAll: () => set({ values: getDefaults() }),
    }),
    { name: "mixtape-client-settings" },
  ),
)
