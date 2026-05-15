import { scan, type ScanResult } from "@/server/scanner"

export type SourceScan = {
  scan: ScanResult
  rootPath: string
  sourceId: string
}

export async function parse(rootPath: string, sourceId: string): Promise<SourceScan> {
  const scanResult = await scan(rootPath)
  return { scan: scanResult, rootPath, sourceId }
}
