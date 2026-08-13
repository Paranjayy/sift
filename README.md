# sift

> Sift through the mess.

A terminal file organizer built with TypeScript + Ink. Pick a folder, preview how files will be grouped, confirm, and watch it happen.

![sift](https://img.shields.io/badge/status-early%20dev-blue)
![license](https://img.shields.io/badge/license-MIT-green)

---

## Install

From source (builds automatically, then makes `sift` available globally):

```bash
git clone https://github.com/Paranjayy/sift.git
cd sift
npm install
npm link
```

That's it — `sift` is now a global command.

## Usage

```bash
sift [directory]        Organize a specific directory
sift --global           Batch organize configured folders
sift repos              List all git repos + backup status
sift repos --everywhere Deep-scan all of home
sift backup             Interactive — pick a scan scope, then choose repos
sift backup <name>      Back up one repo
sift backup --all       Back up every repo (also pushes existing remotes)
sift backup --nuke      Back up, then Trash the whole repo (full snapshot first)
sift backup --nuke-ignored  Back up, then Trash gitignored junk (node_modules etc.)
sift restore <name>     Restore a repo from its local backup bundle
sift --undo             Restore the last organize
sift                    Interactive folder browser
```

`repos`/`backup` scan `~/Developer` by default (`--root <dir>` to change, `--everywhere` to deep-scan all of home). `sift backup` interactively asks where to scan (Developer / Home / Everywhere / custom path) before showing the repo picker. Backups that can't reach GitHub (or when `--local`) go to `~/.config/sift/backups/`.

**Nuking is Trash-safe** — nothing is deleted forever. `--nuke` snapshots the whole repo to a tar first, `--nuke-ignored` archives untracked+ignored files first, then both move things to `~/.Trash`. `--github`/`--local` force the backup destination.

Or run without installing:

```bash
npm run dev
```

## Features

- **Full folder browser** — navigate the filesystem in the TUI (open/back/home/root, toggle hidden)
- **Quick folder search** — `Ctrl+K`/`f` fuzzy-jumps to any subfolder
- **Opens where you are** — starts in your current directory
- **4 grouping modes** — flat, by extension, smart categories, custom rules
- **Live preview** — see before/after before any files move
- **Safe by default** — never moves without confirmation
- **Undo** — `sift --undo` restores the last organize
- **Git repo inventory** — `sift repos` shows every repo, its remote, and whether it's backed up
- **Git backup** — `sift backup` auto-creates private GitHub repos via `gh`, or bundles locally
- **Batch mode** — `sift --global` organizes Downloads, Desktop, Documents at once
- **Screenshot detection** — catches `Screenshot *` and `SCR-*` patterns
- **Custom rules** — define your own grouping in `~/.config/sift/config.yaml`

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j`/`k` or `↑`/`↓` | Navigate |
| `Enter` or `→`/`l` | Open folder |
| `←`/`h`/`Backspace` | Go up |
| `o` | Organize current folder |
| `Ctrl+K` or `f` | Quick folder search |
| `~` | Home |
| `/` | Filesystem root |
| `t` | Toggle hidden files |
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
