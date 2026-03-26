# pi-deck

A custom two-line footer extension for [pi](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent). · [GitHub](https://github.com/hisea/pi-deck)

## Install

```bash
pi install npm:@haispeed/pi-deck
```

## What it shows

**Line 1**
- Active model (muted mint)
- Current directory (muted green)
- Git branch (muted pink)
- Git worktree (muted purple, only when in a worktree)
- Context progress bar `[━━━─────────]` with percentage (right-aligned)
- Thinking level indicator `◐ medium` (right-aligned)

**Line 2**
- Token stats: `↑input ↓output R cache-read W cache-write $cost context%/window` (right-aligned)

## Icons

Requires a [Nerd Font](https://www.nerdfonts.com/) in your terminal.

| Part       | Codepoint  |
|------------|------------|
| Model      | `\uee0d`   |
| Directory  | `\uf4d3`   |
| Branch     | `\uf126`   |
| Worktree   | `\uf1bb`   |
| Context    | `\uf2db`   |

## Themes

This package includes:

### Kanagawa
- `kanagawa-wave`
- `kanagawa-dragon`
- `kanagawa-lotus`

Palette source: [rebelot/kanagawa.nvim](https://github.com/rebelot/kanagawa.nvim/blob/master/lua/kanagawa/colors.lua)

### Kanso
- `kanso-ink`
- `kanso-zen`
- `kanso-mist`
- `kanso-pearl`

Palette source: [webhooked/kanso.nvim](https://github.com/webhooked/kanso.nvim/blob/main/lua/kanso/colors.lua)

After install, pick a theme in `pi` via `/settings` → `theme`.

## License

[MIT](LICENSE)
