import type { Source } from "@/lib/types"
import { scan, type ScanResult } from "@/server/scanner"

export type SourceScan = {
  scan: ScanResult
  rootPath: string
}

export async function parse(source: Source): Promise<SourceScan> {
  const scanResult = await scan(source)
  return { scan: scanResult, rootPath: source.rootPath }
}
