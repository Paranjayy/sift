import React, {useState, useEffect, useRef} from 'react';
import {Box, Text, useInput} from 'ink';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {OrganizeConfig} from '../types.js';
import {scanDirectory, computeStats, getFileIcon} from '../utils/scanner.js';
import {colors} from './styles.js';

interface FolderPickerProps {
  onSelect: (folder: string) => void;
  config: OrganizeConfig;
  onSearchActive?: (active: boolean) => void;
}

interface DirItem {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
}

const SKIP_SEARCH_DIRS = new Set([
  'node_modules',
  '.git',
  '.cache',
  'Library',
  'Applications',
  '.Trash',
  'venv',
  '.venv',
  'target',
  '.next',
]);

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function FolderPicker({onSelect, config, onSearchActive}: FolderPickerProps) {
  const [currentPath, setCurrentPath] = useState(process.cwd());
  const [items, setItems] = useState<DirItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showHidden, setShowHidden] = useState(config.showHidden);
  const [stats, setStats] = useState<{totalFiles: number; totalSize: number; topExts: string[]; truncated: boolean} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchIndex, setSearchIndex] = useState<string[]>([]);
  const [searchIndexing, setSearchIndexing] = useState(false);
  const [searchSelected, setSearchSelected] = useState(0);
  const indexCache = useRef(new Map<string, Promise<string[]>>());

  useEffect(() => {
    loadDir(currentPath);
  }, [currentPath, showHidden]);

  const loadDir = async (dirPath: string) => {
    setIsLoading(true);
    try {
      const entries = await fs.promises.readdir(dirPath, {withFileTypes: true});
      const items: DirItem[] = entries
        .filter((e) => showHidden || !e.name.startsWith('.'))
        .map((e) => ({
          name: e.name,
          path: path.join(dirPath, e.name),
          isDir: e.isDirectory(),
          size: 0,
        }))
        .sort((a, b) => {
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

      setItems(items);
      setSelectedIndex(0);

      const fileItems = items.filter((i) => !i.isDir);
      let totalSize = 0;
      let truncated = false;

      if (fileItems.length <= 2000) {
        const sizes = await Promise.all(
          fileItems.map(async (f) => {
            try {
              return (await fs.promises.stat(f.path)).size;
            } catch {
              return 0;
            }
          })
        );
        totalSize = sizes.reduce((a, b) => a + b, 0);
      } else {
        truncated = true;
      }

      const extCounts = new Map<string, number>();
      for (const f of fileItems) {
        const ext = path.extname(f.name).toLowerCase() || 'no-ext';
        extCounts.set(ext, (extCounts.get(ext) || 0) + 1);
      }
      const topExts = Array.from(extCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([ext]) => ext);

      setStats({totalFiles: fileItems.length, totalSize, topExts, truncated});
    } catch {
      setItems([]);
      setStats(null);
    }
    setIsLoading(false);
  };

  const goTo = (dirPath: string) => {
    setCurrentPath(dirPath);
  };

  const enterSelected = () => {
    const item = items[selectedIndex];
    if (item?.isDir) {
      goTo(item.path);
    }
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
    setSearchResults([]);
    onSearchActive?.(false);
  };

  const buildIndex = (dirPath: string): Promise<string[]> => {
    const cached = indexCache.current.get(dirPath);
    if (cached) return cached;

    const promise = (async () => {
      const anchors = [dirPath, process.cwd(), os.homedir(), path.parse(dirPath).root];
      const found: string[] = [];
      const walk = async (dir: string, depth: number) => {
        if (depth > 3) return;
        let entries;
        try {
          entries = await fs.promises.readdir(dir, {withFileTypes: true});
        } catch {
          return;
        }
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          if (entry.name.startsWith('.') && !showHidden) continue;
          if (SKIP_SEARCH_DIRS.has(entry.name)) continue;
          const full = path.join(dir, entry.name);
          found.push(full);
          await walk(full, depth + 1);
        }
      };
      await walk(dirPath, 1);
      for (const a of anchors) {
        if (!found.includes(a)) found.push(a);
      }
      return found;
    })();

    indexCache.current.set(dirPath, promise);
    return promise;
  };

  const openSearch = () => {
    setSearchOpen(true);
    setQuery('');
    setSearchResults([]);
    setSearchSelected(0);
    setSearchIndexing(true);
    setSearchIndex([]);
    onSearchActive?.(true);
    buildIndex(currentPath)
      .then((index) => {
        setSearchIndex(index);
        setSearchIndexing(false);
      })
      .catch(() => {
        setSearchIndex([]);
        setSearchIndexing(false);
      });
  };

  useEffect(() => {
    if (!searchOpen) return;
    const q = query.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setSearchSelected(0);
      return;
    }

    const ranked = searchIndex
      .map((dirPath) => {
        const rel = path.relative(currentPath, dirPath) || path.basename(dirPath);
        const baseName = path.basename(dirPath).toLowerCase();
        const relLower = rel.toLowerCase();
        const baseIdx = baseName.indexOf(q);
        const relIdx = relLower.indexOf(q);
        if (relIdx === -1) return null;
        const score = (baseIdx >= 0 ? 0 : 2) * 10000 + relIdx + rel.length / 1000;
        return {dirPath, rel, score};
      })
      .filter((x): x is {dirPath: string; rel: string; score: number} => x !== null)
      .sort((a, b) => a.score - b.score)
      .slice(0, 12)
      .map((x) => x.dirPath);

    setSearchResults(ranked);
    setSearchSelected(0);
  }, [query, searchIndex, currentPath, searchOpen]);

  useInput((input, key) => {
    if (searchOpen) {
      if (key.escape) {
        closeSearch();
        return;
      }
      if (key.return && searchResults.length > 0) {
        goTo(searchResults[searchSelected]);
        closeSearch();
        return;
      }
      if (key.upArrow || input === 'k') {
        setSearchSelected((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow || input === 'j') {
        setSearchSelected((i) => Math.min(searchResults.length - 1, i + 1));
        return;
      }
      if (key.backspace) {
        setQuery((q) => q.slice(0, -1));
        return;
      }
      if (input) {
        setQuery((q) => q + input);
      }
      return;
    }

    if ((key.ctrl && input === 'k') || input === 'f') {
      openSearch();
      return;
    }
    if (key.upArrow || input === 'k') {
      setSelectedIndex((i) => Math.max(0, i - 1));
    }
    if (key.downArrow || input === 'j') {
      setSelectedIndex((i) => Math.min(items.length - 1, i + 1));
    }
    if (key.return || key.rightArrow || input === 'l') {
      enterSelected();
    }
    if (key.leftArrow || input === 'h' || key.backspace) {
      const parent = path.dirname(currentPath);
      if (parent !== currentPath) {
        goTo(parent);
      }
    }
    if (input === 'o') {
      onSelect(currentPath);
    }
    if (input === '~') {
      goTo(os.homedir());
    }
    if (input === '/') {
      goTo(path.parse(currentPath).root);
    }
    if (input === 't') {
      setShowHidden((v) => !v);
    }
  });

  return (
    <Box flexDirection="row" flexGrow={1}>
      <Box
        flexDirection="column"
        width="45%"
        borderRight={true}
        borderColor={colors.muted}
        paddingRight={1}
      >
        <Box marginBottom={1} justifyContent="space-between" flexDirection="row">
          <Text bold color={colors.accent}>
            Files
          </Text>
          <Text color={colors.muted}>hidden: {showHidden ? 'on' : 'off'}</Text>
        </Box>
        {isLoading ? (
          <Text color={colors.muted}>Loading...</Text>
        ) : items.length === 0 ? (
          <Text color={colors.muted}>Empty folder</Text>
        ) : (
          items.map((item, i) => (
            <Box key={item.path} flexDirection="row" gap={1}>
              <Text color={i === selectedIndex ? colors.accent : undefined}>
                {i === selectedIndex ? '▸ ' : '  '}
              </Text>
              <Text>{getFileIcon(item.isDir ? '' : path.extname(item.name).toLowerCase(), item.isDir)}</Text>
              <Text color={i === selectedIndex ? colors.fg : colors.muted}>
                {item.name}
                {item.isDir ? '/' : ''}
              </Text>
              {!item.isDir && (
                <Text color={colors.muted}>{formatSize(item.size)}</Text>
              )}
            </Box>
          ))
        )}
      </Box>

      <Box flexDirection="column" flexGrow={1} paddingLeft={1}>
        <Box flexDirection="row" gap={1} marginBottom={1}>
          <Text bold color={colors.highlight}>{currentPath}</Text>
        </Box>

        <Box flexDirection="column" marginTop={1} gap={1}>
          <Text color={colors.cyan}>
            o — Organize this folder
          </Text>
          <Text color={colors.muted}>
            Enter: open | ←/h: up | ~: home | /: root | t: hidden | ⌃K/f: search
          </Text>
        </Box>

        {stats && (
          <Box
            flexDirection="column"
            marginTop={2}
            borderStyle="single"
            borderColor={colors.muted}
            padding={1}
          >
            <Text bold color={colors.accent}>Stats</Text>
            <Text>Files: {stats.totalFiles}</Text>
            <Text>Size: {stats.truncated ? `${formatSize(stats.totalSize)} (large dir, sizes skipped)` : formatSize(stats.totalSize)}</Text>
            {stats.topExts.length > 0 && (
              <Text color={colors.muted}>Top: {stats.topExts.join(', ')}</Text>
            )}
          </Box>
        )}
      </Box>

      {searchOpen && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          backgroundColor={colors.bg}
        >
          <Box borderStyle="double" borderColor={colors.accent} padding={2} flexDirection="column" gap={1} width="70%">
            <Text bold color={colors.accent}>⌃K — Quick Folder Search</Text>
            <Box flexDirection="row" gap={1}>
              <Text color={colors.cyan}>🔍</Text>
              <Text color={colors.fg}>{query || 'type to search…'}</Text>
            </Box>
            {searchIndexing ? (
              <Text color={colors.muted}>Indexing folders…</Text>
            ) : query && searchResults.length === 0 ? (
              <Text color={colors.muted}>No matches</Text>
            ) : (
              searchResults.map((dirPath, i) => (
                <Box key={dirPath} flexDirection="row" gap={1}>
                  <Text color={i === searchSelected ? colors.accent : undefined}>
                    {i === searchSelected ? '▸ ' : '  '}
                  </Text>
                  <Text>📁</Text>
                  <Text color={i === searchSelected ? colors.fg : colors.muted}>
                    {path.relative(currentPath, dirPath) || path.basename(dirPath)}
                  </Text>
                </Box>
              ))
            )}
            <Text color={colors.muted}>j/k: move | Enter: open | Esc: close</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}