# Organize — Terminal File Curator

## Overview

A full-screen TUI application that scans a selected folder, groups files by extension or category, shows a preview of the proposed reorganization, and on confirmation creates folders and moves files. Built in Go with the Charm ecosystem (Bubbletea + Lipgloss + Bubbles).

**Repo name:** `organize`
**Binary name:** `organize`
**Tagline:** "Hazel, but in your terminal."

---

## Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Language | Go 1.22+ | Single binary, fast file ops, cross-compilation |
| TUI Framework | Bubbletea v2 | Elm architecture, battle-tested, great docs |
| Styling | Lipgloss | Terminal CSS, beautiful themes |
| Components | Bubbles | Text input, viewport, list, help |
| Config | Viper + YAML | Standard Go config, supports `~/.config/organize/` |
| File Ops | `os` + `filepath` | Native Go, no deps |

---

## Architecture

```
organize/
├── cmd/organize/
│   └── main.go                  # Entry point, CLI flags
├── internal/
│   ├── scanner/
│   │   └── scanner.go           # Walk directory, collect file metadata
│   ├── organizer/
│   │   ├── organizer.go         # Core: grouping logic, folder creation, file moves
│   │   └── categories.go        # Smart category definitions (images, video, etc.)
│   ├── rules/
│   │   └── rules.go             # Custom rule engine (YAML-based)
│   ├── tui/
│   │   ├── app.go               # Root model, screen routing, global keybindings
│   │   ├── folderpicker.go      # Screen 1: filesystem navigation
│   │   ├── preview.go           # Screen 2: before/after preview + stats
│   │   ├── confirm.go           # Screen 3: confirmation dialog
│   │   ├── progress.go          # Screen 4: animated execution
│   │   ├── completed.go         # Screen 5: results summary
│   │   └── styles.go            # Lipgloss theme, colors, borders
│   └── config/
│       ├── config.go            # Load/save config
│       └── defaults.go          # Default settings
├── go.mod
├── go.sum
├── README.md
└── LICENSE
```

---

## Core Workflow

```
Start → Folder Picker → Scan → Preview → Confirm → Execute → Done
                                ↑                      |
                                └──── edit rules ──────┘
```

### Screen 1: Folder Picker
- Navigable tree view of filesystem
- Keyboard: `j`/`k` or arrows to move, `Enter` to select, `~` for home, `/` for path input
- Sidebar shows live stats: total files, top extensions, estimated folders to create
- Can type a path directly with `/`

### Screen 2: Preview
- **Left panel:** Current folder structure (tree view)
- **Right panel:** Proposed new structure after organizing
- **Bottom bar:** Stats — total files, folders to create, space breakdown by category
- **Mode toggle:** `1` = Flat, `2` = By Extension, `3` = Smart Categories
- Files shown with color-coded icons by type
- Scrollable panels with `tab` to switch focus

### Screen 3: Confirmation
- Summary card: "Will move X files into Y folders"
- List of folders that will be created
- `y` to execute, `b` to go back, `e` to edit rules, `q` to quit

### Screen 4: Progress
- Animated progress bar per folder
- File-by-file ticker as moves happen
- Error count displayed live

### Screen 5: Completed
- Summary: files moved, folders created, errors (if any)
- `o` to open folder in Finder, `r` to re-scan, `q` to quit

---

## Grouping Modes

### Mode 1: Flat
All files grouped into category folders by broad type.
```
Before:                     After:
├── photo.jpg               ├── Images/
├── song.mp3                │   ├── photo.jpg
├── doc.pdf                 │   └── design.png
├── design.png              ├── Audio/
├── video.mp4               │   └── song.mp3
└── notes.txt               ├── Documents/
                            │   ├── doc.pdf
                            │   └── notes.txt
                            └── Video/
                                └── video.mp4
```

### Mode 2: By Extension
Each extension gets its own subfolder.
```
Before:                     After:
├── photo.jpg               ├── jpg/
├── design.png              │   └── photo.jpg
├── song.mp3                ├── png/
└── doc.pdf                 │   └── design.png
                            ├── mp3/
                            │   └── song.mp3
                            └── pdf/
                                └── doc.pdf
```

### Mode 3: Smart Categories
AI-like grouping based on file type heuristics.
```
Before:                     After:
├── photo.jpg               ├── photos/
├── screenshot.png          │   ├── photo.jpg
├── song.mp3                │   └── screenshot.png
├── podcast.mp3             ├── music/
├── doc.pdf                 │   └── song.mp3
├── notes.md                ├── podcasts/
├── video.mp4               │   └── podcast.mp3
└── archive.zip             ├── documents/
                            │   ├── doc.pdf
                            │   └── notes.txt
                            ├── video/
                            │   └── video.mp4
                            └── archives/
                                └── archive.zip
```

### Mode 4: Custom Rules
User-defined rules in `~/.config/organize/rules.yaml`:
```yaml
rules:
  - name: Screenshots
    pattern: "Screenshot *"
    destination: Screenshots/
  - name: Shottr screenshots
    pattern: "SCR-*"
    destination: Screenshots/shottr/
  - name: Project files
    extensions: [.js, .ts, .jsx, .tsx]
    destination: Code/
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j`/`k` or `↑`/`↓` | Navigate |
| `Enter` | Select / confirm |
| `Tab` | Switch panel focus |
| `1`/`2`/`3` | Toggle grouping mode |
| `/` | Jump to path |
| `~` | Go to home directory |
| `?` | Toggle help overlay |
| `q` / `Ctrl+C` | Quit |
| `b` | Go back |
| `y` | Confirm action |
| `e` | Edit rules |
| `r` | Re-scan |
| `o` | Open in Finder |

---

## Config

Location: `~/.config/organize/config.yaml`

```yaml
# Default grouping mode: flat, extension, smart, custom
default_mode: smart

# Show hidden files
show_hidden: false

# Dry run by default (never execute without explicit confirmation)
dry_run: true

# Exclude patterns
exclude:
  - ".DS_Store"
  - "Thumbs.db"
  - ".git"
  - "node_modules"

# Custom rules (optional)
rules: []
```

---

## Design Principles

1. **Safety first** — never move files without explicit confirmation. Dry-run preview is the default.
2. **Fast** — scan and preview should feel instant, even for large folders.
3. **Beautiful** — full-screen TUI with consistent theming, not a ugly CLI tool.
4. **Non-destructive** — moves files, never deletes. Undo support in v1.1.
5. **Extensible** — custom rules, config profiles, plugin hooks later.

---

## MVP Scope (v1.0)

- [ ] Folder picker with tree navigation
- [ ] File scanner with metadata collection
- [ ] 3 grouping modes (flat, extension, smart)
- [ ] Preview panel with before/after
- [ ] Stats bar (file count, folder count, space)
- [ ] Confirmation dialog
- [ ] Execution with progress
- [ ] Completion summary
- [ ] Config loading
- [ ] Help overlay

---

## Related Projects (not affiliated, but kewl)

- [Mole](https://github.com/tw93/mole) — Mac cleanup terminal utility
- [Burrow](https://github.com/caezium/Burrow) — Open-source desktop utility
- [Neodisk](https://github.com/tkslucas/Neodisk) — macOS disk visualizer
- [Mouzi](https://github.com/hsr88/mouzi) — Automatic Downloads organizer
- [Hazel](https://www.noodlesoft.com/) — macOS file management automation
- [organize](https://github.com/tfeldmann/organize) — Python file management tool
