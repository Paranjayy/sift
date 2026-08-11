import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {OrganizeConfig} from '../types';
import {scanDirectory, computeStats} from '../utils/scanner';
import {colors, boxStyles} from './styles';

interface FolderPickerProps {
  onSelect: (folder: string) => void;
  config: OrganizeConfig;
}

interface DirItem {
  name: string;
  path: string;
  isDir: boolean;
}

export function FolderPicker({onSelect, config}: FolderPickerProps) {
  const [currentPath, setCurrentPath] = useState(os.homedir());
  const [items, setItems] = useState<DirItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [stats, setStats] = useState<{totalFiles: number; topExts: string[]} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDir(currentPath);
  }, [currentPath]);

  const loadDir = async (dirPath: string) => {
    setIsLoading(true);
    try {
      const entries = await fs.promises.readdir(dirPath, {withFileTypes: true});
      const dirs: DirItem[] = entries
        .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
        .map((e) => ({name: e.name, path: path.join(dirPath, e.name), isDir: true}))
        .sort((a, b) => a.name.localeCompare(b.name));

      setItems(dirs);
      setSelectedIndex(0);

      const files = await scanDirectory(dirPath, config.showHidden, config.exclude);
      const stats = computeStats(files);
      const topExts = Array.from(stats.byExtension.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([ext]) => ext);

      setStats({totalFiles: stats.totalFiles, topExts});
    } catch {
      setItems([]);
      setStats(null);
    }
    setIsLoading(false);
  };

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelectedIndex((i) => Math.max(0, i - 1));
    }
    if (key.downArrow || input === 'j') {
      setSelectedIndex((i) => Math.min(items.length - 1, i + 1));
    }
    if (key.return) {
      onSelect(currentPath);
    }
    if (key.backspace) {
      setCurrentPath(path.dirname(currentPath));
    }
    if (input === '~') {
      setCurrentPath(os.homedir());
    }
    if (input === '/') {
      // TODO: path input mode
    }
  });

  return (
    <Box {...boxStyles.content}>
      <Box {...boxStyles.sidebar}>
        <Text bold color={colors.accent} marginBottom={1}>
          Folders
        </Text>
        {isLoading ? (
          <Text color={colors.muted}>Loading...</Text>
        ) : items.length === 0 ? (
          <Text color={colors.muted}>No folders</Text>
        ) : (
          items.map((item, i) => (
            <Box key={item.path} flexDirection="row" gap={1}>
              <Text color={i === selectedIndex ? colors.accent : undefined}>
                {i === selectedIndex ? '▸ ' : '  '}
              </Text>
              <Text color={i === selectedIndex ? colors.fg : colors.muted}>
                {item.name}/
              </Text>
            </Box>
          ))
        )}
      </Box>

      <Box {...boxStyles.main} paddingLeft={1}>
        <Text bold color={colors.highlight} marginBottom={1}>
          {currentPath}
        </Text>

        <Box flexDirection="column" marginTop={1} gap={1}>
          <Text color={colors.cyan}>
            Press Enter to organize this folder
          </Text>
          <Text color={colors.muted}>
            Backspace: parent | ~: home
          </Text>
        </Box>

        {stats && (
          <Box flexDirection="column" marginTop={2} border={true} borderColor={colors.muted} padding={1}>
            <Text bold color={colors.accent}>Stats</Text>
            <Text>Files: {stats.totalFiles}</Text>
            {stats.topExts.length > 0 && (
              <Text color={colors.muted}>Top: {stats.topExts.join(', ')}</Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
