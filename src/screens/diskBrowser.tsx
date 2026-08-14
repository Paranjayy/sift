import React, {useState, useEffect} from 'react';
import {Box, Text, useInput, useStdout} from 'ink';
import * as path from 'path';
import {analyzeDisk, renderDiskBar, formatSize, type DiskItem, trashDiskItem} from '../utils/disk.js';
import {colors} from './styles.js';

interface DiskBrowserProps {
  initialPath: string;
  onExit: () => void;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s.padEnd(n);
}

export function DiskBrowser({initialPath, onExit}: DiskBrowserProps) {
  const {stdout} = useStdout();
  const cols = stdout?.columns ?? 100;
  const rows = stdout?.rows ?? 24;

  const [currentPath, setCurrentPath] = useState(path.resolve(initialPath));
  const [items, setItems] = useState<DiskItem[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const nameW = Math.max(12, Math.floor(cols * 0.35));
  const barW = Math.max(10, cols - nameW - 25);
  const visible = Math.max(4, rows - 8);
  const start = Math.max(0, Math.min(selectedIndex - Math.floor(visible / 2), items.length - visible));
  const shown = items.slice(start, start + visible);
  const topHidden = start;
  const bottomHidden = items.length - (start + shown.length);

  useEffect(() => {
    loadDir(currentPath);
  }, [currentPath]);

  const loadDir = async (dirPath: string) => {
    setIsLoading(true);
    setStatusMessage('');
    try {
      const res = await analyzeDisk(dirPath);
      setItems(res.items);
      setTotalSize(res.totalSize);
      setSelectedIndex(0);
    } catch {
      setItems([]);
      setTotalSize(0);
    }
    setIsLoading(false);
  };

  const enterSelected = () => {
    const item = items[selectedIndex];
    if (item?.isDir) {
      setCurrentPath(item.path);
    }
  };

  const handleDelete = async () => {
    const item = items[selectedIndex];
    if (!item) return;

    setConfirmDelete(false);
    setIsLoading(true);
    setStatusMessage(`Trashing ${item.name}…`);
    try {
      const trashDest = await trashDiskItem(item.path);
      setStatusMessage(`✓ Moved ${item.name} to Trash`);
      // Reload directory sizes
      const res = await analyzeDisk(currentPath);
      setItems(res.items);
      setTotalSize(res.totalSize);
      setSelectedIndex(0);
    } catch (err) {
      setStatusMessage(`✗ Error: ${(err as Error).message.slice(0, 50)}`);
    }
    setIsLoading(false);
  };

  useInput((input, key) => {
    if (confirmDelete) {
      if (input === 'y' || key.return) {
        handleDelete();
        return;
      }
      if (input === 'n' || key.escape) {
        setConfirmDelete(false);
        return;
      }
      return;
    }

    if (key.upArrow || input === 'k') {
      setSelectedIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow || input === 'j') {
      setSelectedIndex((i) => Math.min(items.length - 1, i + 1));
      return;
    }
    if (key.return || key.rightArrow || input === 'l') {
      enterSelected();
      return;
    }
    if (key.leftArrow || input === 'h' || key.backspace) {
      const parent = path.dirname(currentPath);
      if (parent !== currentPath) {
        setCurrentPath(parent);
      }
      return;
    }
    if (input === 'd') {
      setConfirmDelete(true);
      return;
    }
    if (input === 'q' || key.escape) {
      onExit();
    }
  });

  const selectedItem = items[selectedIndex];

  return (
    <Box flexDirection="column" flexGrow={1} padding={1}>
      <Box
        flexDirection="column"
        flexGrow={1}
        borderStyle="single"
        borderColor={colors.muted}
        paddingX={1}
      >
        <Box marginBottom={1} justifyContent="space-between" flexDirection="row">
          <Text bold color={colors.accent}>sift disk — visual size analyzer</Text>
          <Text color={colors.muted}>Total size: {formatSize(totalSize)}</Text>
        </Box>

        <Box marginBottom={1}>
          <Text bold color={colors.highlight}>{currentPath}</Text>
        </Box>

        {isLoading ? (
          <Box flexGrow={1} justifyContent="center" alignItems="center">
            <Text color={colors.cyan}>{statusMessage || 'Analyzing directory sizes…'}</Text>
          </Box>
        ) : items.length === 0 ? (
          <Box flexGrow={1} justifyContent="center" alignItems="center">
            <Text color={colors.muted}>Empty directory or access denied.</Text>
          </Box>
        ) : confirmDelete && selectedItem ? (
          <Box flexGrow={1} flexDirection="column" justifyContent="center" alignItems="center" gap={1}>
            <Text color={colors.warning}>⚠️ Move to Trash?</Text>
            <Text>
              Folder: <Text bold color={colors.highlight}>{selectedItem.name}</Text> ({formatSize(selectedItem.size)})
            </Text>
            <Text color={colors.muted}>This moves the item to ~/.Trash. It is not permanently nuked.</Text>
            <Box marginTop={1}>
              <Text color={colors.muted}>y: confirm | n: cancel</Text>
            </Box>
          </Box>
        ) : (
          <Box flexDirection="column" flexGrow={1}>
            {topHidden > 0 && <Text color={colors.muted}>… {topHidden} more above</Text>}
            {shown.map((item) => {
              const isSelected = selectedIndex === items.indexOf(item);
              const pct = totalSize > 0 ? (item.size / totalSize) * 100 : 0;
              const bar = renderDiskBar(item.size, totalSize, barW);
              const suffix = item.isDir ? '/' : '';
              return (
                <Box key={item.path} flexDirection="row" gap={1}>
                  <Text color={isSelected ? colors.accent : undefined}>
                    {isSelected ? '▸ ' : '  '}
                  </Text>
                  <Text>{item.isDir ? '📁' : '📄'}</Text>
                  <Text color={isSelected ? colors.fg : colors.muted}>
                    {truncate(item.name + suffix, nameW)}
                  </Text>
                  <Text color={colors.highlight}>{formatSize(item.size).padStart(9)}</Text>
                  <Text color={colors.muted}>{bar}</Text>
                  <Text color={colors.cyan}>{pct.toFixed(0).padStart(3)}%</Text>
                </Box>
              );
            })}
            {bottomHidden > 0 && <Text color={colors.muted}>… {bottomHidden} more below</Text>}
          </Box>
        )}

        {statusMessage && !isLoading && (
          <Box marginTop={1}>
            <Text color={statusMessage.startsWith('✓') ? colors.cyan : colors.warning}>
              {statusMessage}
            </Text>
          </Box>
        )}

        {!confirmDelete && !isLoading && (
          <Box marginTop={1} borderTop={true} borderColor={colors.muted} paddingTop={1}>
            <Text color={colors.muted}>
              j/k: navigate | Enter: enter | ←: back | d: Trash selected | q: exit
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}