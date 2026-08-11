# sift — Terminal File Curator

## Overview

A full-screen TUI application that scans a selected folder, groups files by extension or category, shows a preview of the proposed reorganization, and on confirmation creates folders and moves files. Built with TypeScript + Ink.

**Repo:** `sift`
**Binary:** `sift`
**Tagline:** "Sift through the mess."

---

## Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Language | TypeScript | Type safety, great DX |
| TUI Framework | Ink v7 | React-based, flexbox layout, battle-tested |
| Styling | Ink Box/Text | Built-in terminal styling |
| Config | YAML | Human-readable, easy to edit |
| File Ops | Node.js `fs` | Native, no deps |

---

## Architecture

```
sift/
├── src/
│   ├── main.tsx              # Entry point
│   ├── types.ts              # Core types
│   ├── screens/
│   │   ├── app.tsx           # Root app, screen routing
│   │   ├── folderPicker.tsx  # Folder navigation
│   │   ├── preview.tsx       # Before/after preview
│   │   ├── confirm.tsx       # Confirmation dialog
│   │   ├── progress.tsx      # Animated execution
│   │   ├── completed.tsx     # Results summary
│   │   └── styles.ts         # Theme colors
│   └── utils/
│       ├── scanner.ts        # File system scanning
│       ├── organizer.ts      # Grouping + file moves
│       └── config.ts         # Config loading
├── docs/
│   ├── design.md             # This file
│   └── IDEAS.md              # Future features
├── package.json
└── tsconfig.json
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
- Keyboard: `j`/`k` or arrows to move, `Enter` to select, `~` for home
- Sidebar shows live stats: total files, top extensions

### Screen 2: Preview
- **Left panel:** Current folder structure (tree view)
- **Right panel:** Proposed new structure after organizing
- **Bottom bar:** Stats — total files, folders to create, space breakdown
- **Mode toggle:** `1` = Flat, `2` = By Extension, `3` = Smart Categories

### Screen 3: Confirmation
- Summary card: "Will move X files into Y folders"
- List of folders that will be created
- `y` to execute, `b` to go back, `q` to quit

### Screen 4: Progress
- Animated progress bar
- File-by-file ticker as moves happen
- Error count displayed live

### Screen 5: Completed
- Summary: files moved, folders created, errors (if any)
- `r` to re-scan, `q` to quit

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
Intelligent grouping based on file type heuristics.
```
Before:                     After:
├── photo.jpg               ├── Screenshots/
├── screenshot.png          │   ├── photo.jpg
├── SCR-20260804.png        │   └── screenshot.png
├── song.mp3                ├── Audio/
├── podcast.mp3             │   └── song.mp3
├── doc.pdf                 ├── Documents/
├── notes.md                │   ├── doc.pdf
├── video.mp4               │   └── notes.txt
└── archive.zip             ├── Video/
                            │   └── video.mp4
                            └── Archives/
                                └── archive.zip
```

### Mode 4: Custom Rules
User-defined rules in `~/.config/sift/rules.yaml`:
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
| `~` | Go to home directory |
| `?` | Toggle help overlay |
| `q` / `Ctrl+C` | Quit |
| `b` | Go back |
| `y` | Confirm action |
| `r` | Re-scan |

---

## Config

Location: `~/.config/sift/config.yaml`

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

1. **Safety first** — never move files without explicit confirmation
2. **Fast** — scan and preview should feel instant
3. **Beautiful** — full-screen TUI with consistent theming
4. **Non-destructive** — moves files, never deletes
5. **Extensible** — custom rules, config profiles later

---

## MVP Scope (v1.0)

- [x] Folder picker with tree navigation
- [x] File scanner with metadata collection
- [x] 3 grouping modes (flat, extension, smart)
- [x] Preview panel with before/after
- [x] Stats bar (file count, folder count, space)
- [x] Confirmation dialog
- [x] Execution with progress
- [x] Completion summary
- [x] Config loading
- [x] Help overlay

---

## Related Projects (not affiliated, but kewl)

- [Mole](https://github.com/tw93/mole) — Mac cleanup terminal utility
- [Burrow](https://github.com/caezium/Burrow) — Open-source desktop utility
- [Neodisk](https://github.com/tkslucas/Neodisk) — macOS disk visualizer
- [Mouzi](https://github.com/hsr88/mouzi) — Automatic Downloads organizer
- [Hazel](https://www.noodlesoft.com/) — macOS file management automation
- [organize](https://github.com/tfeldmann/organize) — Python file management tool
