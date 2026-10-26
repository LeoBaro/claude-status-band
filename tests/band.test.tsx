import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'status-band',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 19 },
    view: {},
  },
} as const

test('the band shows model, folder, branch, context, cost and time', async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.cwd', () => ({ value: '/home/someone/projects/statusline-maker' }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200000, tokens: 94000, percent: 47 }, rateLimits: [], cost: { usd: 0.42 } },
  }))
  on('clock.now', () => ({ value: 527_000 }))
  on('clock.every', () => ({ value: undefined }))
  on('process.run', (_, e) => ({
    value: {
      exitCode: 0,
      stdout: e.argv.includes('--show-current') ? 'feature/auth-refactor\n' : '',
      stderr: '',
    },
  }))

  await $.session.start({ cwd: '/', surface: 'vscode', isInteractive: true })

  for (const surface of ['terminal', 'vscode'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    for (const words of [/Opus 5\.5/, /~\/projects\/statusline-maker/, /feature\/auth-refactor/, /✓/, /▰{8}▱{8}/, /47%/, /\$0\.42/, /8m 47s/]) {
      expect(await ui.find({ type: 'Text', text: words })).toBeTruthy()
    }
    await ui.unmount()
  }
})
