import React, {useState, useEffect} from 'react';
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
}

interface DirItem {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function FolderPicker({onSelect, config}: FolderPickerProps) {
  const [currentPath, setCurrentPath] = useState(os.homedir());
  const [items, setItems] = useState<DirItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showHidden, setShowHidden] = useState(config.showHidden);
  const [stats, setStats] = useState<{totalFiles: number; totalSize: number; topExts: string[]} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

      const withSizes = await Promise.all(
        items.map(async (item) => {
          if (item.isDir) return item;
          try {
            const stat = await fs.promises.stat(item.path);
            return {...item, size: stat.size};
          } catch {
            return item;
          }
        })
      );

      setItems(withSizes);
      setSelectedIndex(0);

      const files = await scanDirectory(dirPath, config.showHidden, config.exclude);
      const fileStats = computeStats(files);
      const topExts = Array.from(fileStats.byExtension.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([ext]) => ext);

      setStats({totalFiles: fileStats.totalFiles, totalSize: fileStats.totalSize, topExts});
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

  useInput((input, key) => {
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
            Enter: open | ←/h: up | ~: home | /: root | t: hidden
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
            <Text>Size: {formatSize(stats.totalSize)}</Text>
            {stats.topExts.length > 0 && (
              <Text color={colors.muted}>Top: {stats.topExts.join(', ')}</Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}