# status-band

A Claude Code mod that draws a two-row status band above the prompt:

```
 Opus 5.5  |  ~/projects/my-app  |  feature/auth-refactor  | ✓
ctx ▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱ | 47% | $0.42 | 8m 47s
```

| Row | Shows |
| --- | --- |
| 1 | Model, working folder (`~` for home), git branch, `✓` when the tree is clean or `●N` for N changed files |
| 2 | Context window bar, context used (%), session cost (USD), session time |

It works wherever Claude Code draws: the terminal, the VS Code extension and the desktop app.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install status-band --marketplace LeoBaro/claude-status-band
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in every session).

From a shell:

```
claude plugin install status-band --marketplace LeoBaro/claude-status-band
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `LeoBaro/claude-status-band`, then Add plugin.

## Refresh rates

| Figure | Updated |
| --- | --- |
| Session time | every 1 s |
| Branch, changed files, model, folder | every 10 s and after each turn |
| Context %, cost | after each API response |

## Develop

```
claude --plugin-dir .          # run a session with this folder loaded; edits hot-reload
claude plugin validate .
claude plugin test .
```

The mod uses Claude Code's early-access plugin API, so a future release may need small changes.

## License

MIT
