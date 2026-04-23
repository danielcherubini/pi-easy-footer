# pi-easy-footer

A footer extension and session banner for [pi](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent).

[![npm version](https://img.shields.io/npm/v/pi-easy-footer?style=flat-square)](https://www.npmjs.com/package/pi-easy-footer)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

## Install

```bash
pi install pi-easy-footer
```

## Footer

A single-line status bar showing everything you need at a glance:

| Section | Details |
|---------|---------|
| **Model** | Active AI model name |
| **Directory** | Current working directory (popped) |
| **Git branch** | Branch name with live status indicators |
| **Worktree** | Worktree branch (when applicable) |
| **Context bar** | Visual progress bar + `%` of context window used |
| **Thinking level** | `◐ off`, `◐ low`, `◐ medium`, `◐ high`, etc. |
| **Token stats** | `↑input ↓output R cache-read W cache-write $cost` |

### Git status icons

The footer parses `git status --porcelain=v2` for real-time accuracy:

| Icon | Meaning |
|------|---------|
| `●N` | N staged changes |
| `~N` | N unstaged modifications |
| `UN` | N untracked files |
| `↑N` | N commits ahead of remote |
| `↓N` | N commits behind remote |

## Session Banner

Automatically generates a title and banner for each session. It extracts the first user message, summarizes it into a short title, and picks an emoji based on keywords:

| Keywords | Emoji |
|----------|-------|
| bug, fix, error, crash | 🐞 |
| refactor, cleanup | 🧹 |
| test, spec | 🧪 |
| doc, readme | 📝 |
| release, deploy | 🚀 |
| design, ui, theme | 🎨 |

### Configuration

Override via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PI_SESSION_BANNER_EMOJI` | `auto` | Emoji to use (or `auto` for keyword detection) |
| `PI_SESSION_BANNER_FRAME_COLOR` | `dim` | Banner frame color |
| `PI_SESSION_BANNER_TITLE_COLOR` | `mdLink` | Title text color |

## Requirements

- [Nerd Font](https://www.nerdfonts.com/) installed in your terminal for icons to render correctly.

## License

[MIT](LICENSE)
