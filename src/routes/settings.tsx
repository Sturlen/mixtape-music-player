import { useState } from "react"
import { useAudioPlayer } from "@/Player"
import Page from "@/client/components/Page"
import { Button } from "@/client/components/ui/button"
import { Slider } from "@/client/components/ui/slider"
import { Switch } from "@/client/components/ui/switch"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/settings")({
  component: RouteComponent,
})

function RouteComponent() {
  const handleSave = () => {
    // Settings are now auto-saved, no manual save needed
  }

  const handleReset = () => {
    // Reset to defaults handled in Player.tsx
  }

  return (
    <Page title="Settings">
      <div className="mx-auto max-w-2xl space-y-8 p-6">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Audio Settings</h2>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Seamless Transitions</h3>
            <p className="text-muted-foreground text-sm">
              The player automatically preloads the next track to eliminate gaps
              between songs. This provides instant transitions without the
              complexity of crossfading.
            </p>

            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 rounded-full bg-green-500"></div>
              <label className="text-sm font-medium">
                Seamless transitions are always enabled
              </label>
            </div>
          </div>
        </div>
      </div>
    </Page>
  )
}
