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
  const crossfadeEnabled = useAudioPlayer.use.crossfadeEnabled()
  const crossfadeDuration = useAudioPlayer.use.crossfadeDuration()
  const setCrossfadeEnabled = useAudioPlayer.use.setCrossfadeEnabled()
  const setCrossfadeDuration = useAudioPlayer.use.setCrossfadeDuration()

  const [tempEnabled, setTempEnabled] = useState(crossfadeEnabled)
  const [tempDuration, setTempDuration] = useState(crossfadeDuration ?? 2.0)

  const handleSave = () => {
    setCrossfadeEnabled(tempEnabled)
    setCrossfadeDuration(tempDuration)
  }

  const handleReset = () => {
    setTempEnabled(true)
    setTempDuration(2.0)
  }

  return (
    <Page title="Settings">
      <div className="mx-auto max-w-2xl space-y-8 p-6">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Audio Settings</h2>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Crossfade</h3>
            <p className="text-muted-foreground text-sm">
              Crossfade eliminates gaps between songs by overlapping the end of
              one track with the beginning of the next. This is especially
              useful for Bluetooth streaming.
            </p>

            <div className="flex items-center space-x-2">
              <Switch
                id="crossfade-enabled"
                checked={tempEnabled}
                onCheckedChange={setTempEnabled}
              />
              <label
                htmlFor="crossfade-enabled"
                className="text-sm font-medium"
              >
                Enable Crossfade
              </label>
            </div>

            {tempEnabled && (
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  Crossfade Duration: {tempDuration.toFixed(1)}s
                </label>
                <Slider
                  value={[tempDuration]}
                  onValueChange={(value) => setTempDuration(value[0] ?? 2.0)}
                  min={0.5}
                  max={10}
                  step={0.1}
                  className="w-full"
                  disabled={!tempEnabled}
                />
                <p className="text-muted-foreground text-xs">
                  Shorter durations are more subtle, longer durations are more
                  dramatic. Recommended: 2.0s for most music.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex space-x-4">
          <Button onClick={handleSave}>Save Settings</Button>
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
        </div>
      </div>
    </Page>
  )
}
