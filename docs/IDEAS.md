# IDEAS.md — All the Kewl Shit for sift

Everything we want to build eventually. MVP first, then iterate. Nothing here is forgotten.

---

## File Browser (v1.4)

- Opens in current working directory by default (done)
- Quick folder search overlay: `Ctrl+K`/`f`, fuzzy-jumps to subfolders (done)
- Fast shallow stats — recursive scan was slow in huge dirs (done)
- Next: persistent "recent folders" list on open
- Next: rename/delete/duplicate file actions in the browser
- Next: `s` to select a folder and add it to the organize queue without leaving the browser

---

## Git Repo Backup (v1.3)

- `sift repos` — inventory all git repos under a root: branch, dirty, ahead/behind, remote (done)
- `sift backup` — back up repos missing a remote:
  - Auto: create private GitHub repo via `gh` + push (done)
  - Fallback: bare-clone bundle into `~/.config/sift/backups/` (done)
- Interactive multi-select TUI for choosing which repos to back up (done)
- Scan scope picker: Developer / Home / Everywhere (deep) / custom path (done)
- `sift repos --everywhere` deep-scans all of home (done)
- `sift backup <name>` single repo, `--all` everything (done)
- `--nuke` full snapshot tar + Trash the repo; `--nuke-ignored` archive + Trash ignored junk (done)
- Messy repos: auto-commit uncommitted state to backup branch via `git stash create -u`, push all branches+tags with force fallbacks (done)
- Next: schedule via launchd — `sift backup` on a cron/timer
- Next: size-aware backup — skip huge repos, tar+archive large media separately

---

## Disk Usage Analysis (v1.5)

- `sift disk [path]` — Neodisk-style folder size report with visual bars (done)
- Interactive disk space browser in the TUI (drill down with Enter/backspace) (done)
- Move folders/files instantly to Trash via `d` confirmation within the size browser (done)
- Next: filter by size / date within the disk browser
- Next: quick-action to archive folders directly from the size analyzer

---

## Screenshot Handling (v1.2)

- Detect macOS screenshot naming: `Screenshot 2026-08-11 at 00.03.24.png`
- Detect Shottr naming: `SCR-20260804-brcv.png`
- Auto-sort into `Screenshots/` with date-based subfolders
- Option to rename to `YYYY-MM-DD_HH-MM-SS.png` format
- Preview screenshots inline in the TUI (if terminal supports it)

---

## Undo System (v1.1)

- Before moving files, create a manifest: `.sift-manifest.json`
- Manifest records: original path, new path, timestamp
- `sift undo` command reverts the last operation
- `sift undo --all` reverts everything in current session
- Clean old manifests after 30 days

---

## Duplicate Detection (v1.2)

- Hash files (xxhash for speed) before moving
- If duplicate found: show warning in preview
- Options: skip, rename (add suffix), merge into same folder
- Stats: "X duplicate files detected"

---

## Watch Mode (v1.3)

- `sift watch ~/Downloads` — monitors folder continuously
- New files auto-sorted based on rules
- Debounce (wait 2s for file to finish downloading)
- Notification when files are moved (macOS notification center)

---

## Batch Mode (v1.2)

- `sift batch ~/Desktop ~/Downloads ~/Documents`
- Process multiple folders in sequence
- Summary report at the end

---

## Config Profiles (v1.3)

- `sift --profile screenshots` — use a specific config
- Profiles for different workflows: Downloads cleanup, project archiving, etc.
- `sift profile list` / `sift profile create`

---

## Plugin System (v2.0)

- Plugin interface for custom processors
- Hook points: pre-scan, post-scan, pre-move, post-move
- Example plugins:
  - Image EXIF sorter (sort by date taken)
  - Music tag sorter (sort by artist/album)
  - Git repo detector (skip .git dirs)

---

## Visual Enhancements

### TUI Polish
- Animated file icons (spin on load)
- Color-coded file type highlighting
- Smooth transitions between screens
- Progress bar with percentage and ETA
- Mouse support for panel resizing

### Themes
- Dark theme (default)
- Light theme
- Catppuccin, Dracula, Nord support
- `sift --theme catppuccin`

### File Preview
- Image thumbnails (using `viu` or `sixel` if terminal supports)
- Text file preview (first 10 lines)
- PDF page count display
- Video duration/size display

---

## Smart Features

### Intelligent Category Detection
- Learn from user behavior: if they always put `.py` in `Code/Python/`, remember that
- Suggest categories based on folder context (Downloads vs Documents)
- Detect project folders (has `package.json`, `Cargo.toml`, `go.mod`) and skip them

### Size-Aware Grouping
- "Show me files > 100MB"
- "Group large files separately"
- Size breakdown in stats: "Images: 2.3GB, Videos: 15GB, Documents: 500MB"

### Date-Based Sorting
- `sift --by-date` — group by month/year
- `sift --by-date --format "2026/08"` — custom date format

---

## Integration Ideas

### macOS Integration
- `open .` equivalent — open organized folder in Finder
- Spotlight integration — indexed folders appear in Spotlight
- Shortcuts.app integration — run sift from Apple Shortcuts

### CLI Integration
- Pipe support: `ls | sift --stdin`
- FZF integration for folder selection
- Shell completions (bash, zsh, fish)

---

## Monetization / Distribution (Later)

- Homebrew tap: `brew install sift-tui/sift`
- `curl` installer script
- GitHub releases with auto-build for all platforms
- AUR package for Arch Linux
- Snap/Flatpak for Linux

---

## Fun Ideas

- ASCII art splash screen on startup
- Sound effects (optional, via terminal bell)
- Easter egg: if you try to organize `/`, it shows a warning meme
- Achievement system: "Organized 1000 files!", "First undo!", "Zero duplicates!"
- `sift --retro` — green-on-black CRT terminal aesthetic
- `sift --minimal` — ultra-clean, no colors, just text

---

## Performance Goals

- Scan 10,000 files in < 1 second
- Preview generation < 500ms
- Move 1,000 files in < 5 seconds
- Memory usage < 50MB for typical folders

---

## Testing Strategy

- Unit tests for scanner, organizer, rules
- Integration tests with temp directories
- Benchmark tests for performance
- TUI snapshot tests (visual regression)
- Fuzzing for edge cases (unicode filenames, symlinks, permissions)

---

*Last updated: 2026-08-11*
