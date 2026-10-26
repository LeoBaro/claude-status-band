import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Info } from '../types'

const info = atom({ plugin: 'status-band', key: 'info' } as const, null)
const now = atom({ plugin: 'status-band', key: 'now' } as const, 0)

const BAR_CELLS = 16
const GIT_EVERY_MS = 10_000

// "claude-opus-5-5" -> "Opus 5.5"; anything else is shown as given.
function prettyModel(id: string): string {
  const bare = id.replace(/\[.*\]$/, '').trim()
  const full = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?$/i.exec(bare)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  if (full?.[1] && full[2]) {
    return `${cap(full[1])} ${full[2]}${full[3] ? `.${full[3]}` : ''}`
  }
  if (/^(opus|sonnet|haiku|fable)$/i.test(bare)) return cap(bare)
  return bare
}

function shortPath(path: string): string {
  return path.replace(/^\/(home|Users)\/[^/]+/, '~')
}

function bar(percent: number): string {
  const filled = Math.max(0, Math.min(BAR_CELLS, Math.round((percent / 100) * BAR_CELLS)))
  return '▰'.repeat(filled) + '▱'.repeat(BAR_CELLS - filled)
}

function duration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

async function git($: EngineInterface, cwd: string): Promise<Pick<Info, 'branch' | 'dirty'>> {
  try {
    const [head, status] = await Promise.all([
      $.process.run(['git', 'branch', '--show-current'], { cwd, timeoutMs: 5000 }),
      $.process.run(['git', 'status', '--porcelain'], { cwd, timeoutMs: 5000 }),
    ])
    if (head.exitCode !== 0) return { branch: null, dirty: 0 }
    let branch = head.stdout.trim()
    if (branch === '') {
      const sha = await $.process.run(['git', 'rev-parse', '--short', 'HEAD'], { cwd, timeoutMs: 5000 })
      branch = sha.exitCode === 0 ? `@${sha.stdout.trim()}` : 'detached'
    }
    const dirty = status.stdout.split('\n').filter(line => line.trim() !== '').length
    return { branch, dirty }
  } catch {
    return { branch: null, dirty: 0 }
  }
}

// Reads every figure afresh and stores it for the band.
async function refresh($: EngineInterface): Promise<void> {
  const [model, cwd, usage] = await Promise.all([
    $.session.model(),
    $.session.cwd(),
    $.session.usage(),
  ])
  const repo = await git($, cwd)
  const next: Info = {
    model: prettyModel(model),
    cwd: shortPath(cwd),
    ...repo,
    percent: usage.context.percent ?? null,
    usd: usage.cost?.usd ?? null,
    startedAt: usage.startedAt,
  }
  await update($, info, () => next)
  const t = await $.clock.now()
  await update($, now, () => t)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await refresh($)
    $.clock.every(1000, () => {
      void $.clock.now().then(t => update($, now, () => t))
    })
    $.clock.every(GIT_EVERY_MS, () => {
      void refresh($)
    })
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    await refresh($)
    return result
  })

  // Context fill and cost move after each API response.
  on('session.measure', async ($, e, next) => {
    const result = await next(e)
    await update($, info, old =>
      old === null
        ? old
        : { ...old, percent: e.context.percent ?? old.percent, usd: e.cost?.usd ?? old.usd },
    )
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const data = await read($, info)
    if (data === null) return next(e)
    const t = await read($, now)
    const { Box, Text } = $.ui.resolve(e)
    const sep = <Text dimColor> | </Text>

    return (
      <Box flexDirection="column">
        <Text>
          <Text backgroundColor="#6b3fa0" color="#ffffff" bold>
            {` ${data.model} `}
          </Text>
          {sep}
          <Text backgroundColor="#1f5f8b" color="#ffffff">
            {` ${data.cwd} `}
          </Text>
          {data.branch !== null ? (
            <Text>
              {sep}
              <Text backgroundColor="#3b5323" color="#d4f0a0" italic>
                {` ${data.branch} `}
              </Text>
              {sep}
              {data.dirty === 0 ? (
                <Text color="green">✓</Text>
              ) : (
                <Text color="yellow">{`●${data.dirty}`}</Text>
              )}
            </Text>
          ) : null}
        </Text>
        <Text>
          <Text color="cyan">{`ctx ${bar(data.percent ?? 0)}`}</Text>
          {sep}
          <Text bold>{data.percent === null ? '–' : `${Math.round(data.percent)}%`}</Text>
          {sep}
          <Text color="yellow">{data.usd === null ? '$–' : `$${data.usd.toFixed(2)}`}</Text>
          {sep}
          <Text color="magenta" italic>
            {duration(t - data.startedAt)}
          </Text>
        </Text>
      </Box>
    )
  })
}
