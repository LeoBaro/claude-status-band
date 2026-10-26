export type Info = {
  model: string
  cwd: string
  branch: string | null
  dirty: number
  percent: number | null
  usd: number | null
  startedAt: number
}

declare module 'claude-code' {
  interface PluginState {
    'status-band': { info: Info | null; now: number }
  }
}
