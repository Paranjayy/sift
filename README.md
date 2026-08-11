# sift

> Sift through the mess.

A terminal file organizer built with TypeScript + Ink. Pick a folder, preview how files will be grouped, confirm, and watch it happen.

![sift](https://img.shields.io/badge/status-early%20dev-blue)
![license](https://img.shields.io/badge/license-MIT-green)

---

## Install

```bash
git clone https://github.com/Paranjayy/sift.git
cd sift
npm install
```

## Usage

```bash
npm run dev
```

## Features

- **4 grouping modes** — flat, by extension, smart categories, custom rules
- **Live preview** — see before/after before any files move
- **Safe by default** — never moves without confirmation
- **Screenshot detection** — catches `Screenshot *` and `SCR-*` patterns
- **Custom rules** — define your own grouping in `~/.config/sift/config.yaml`

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j`/`k` | Navigate |
| `Enter` | Select |
| `1`/`2`/`3` | Switch mode |
| `y` | Confirm |
| `b` | Back |
| `?` | Help |
| `q` | Quit |

## Config

`~/.config/sift/config.yaml`

```yaml
default_mode: smart
show_hidden: false
exclude:
  - ".DS_Store"
  - ".git"
  - "node_modules"
rules: []
```

## Related

- [Mole](https://github.com/tw93/mole) — Mac cleanup terminal utility
- [Burrow](https://github.com/caezium/Burrow) — Open-source desktop utility
- [Mouzi](https://github.com/hsr88/mouzi) — Automatic Downloads organizer
- [Hazel](https://www.noodlesoft.com/) — macOS file management automation
- [organize](https://github.com/tfeldmann/organize) — Python file management tool

## License

MIT
