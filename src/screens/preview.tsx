import React from 'react';
import {Box, Text, useInput} from 'ink';
import {FileEntry, GroupingResult, GroupingMode} from '../types';
import {colors} from './styles';

interface PreviewProps {
  files: FileEntry[];
  results: GroupingResult[];
  mode: GroupingMode;
  basePath: string;
  onModeChange: (mode: GroupingMode) => void;
  onConfirm: () => void;
  onBack: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function Preview({files, results, mode, basePath, onModeChange, onConfirm, onBack}: PreviewProps) {
  const totalFiles = results.reduce((acc, r) => acc + r.files.length, 0);
  const totalFolders = results.length;
  const totalSize = results.reduce(
    (acc, r) => acc + r.files.reduce((a, f) => a + f.size, 0),
    0
  );

  useInput((input, key) => {
    if (input === '1') onModeChange('flat');
    if (input === '2') onModeChange('extension');
    if (input === '3') onModeChange('smart');
    if (key.return) onConfirm();
    if (key.backspace) onBack();
  });

  return (
    <Box flexDirection="row" flexGrow={1}>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={colors.muted}
        padding={1}
        flexGrow={1}
      >
        <Box marginBottom={1}>
          <Text bold color={colors.accent}>
            Current Structure
          </Text>
        </Box>
        <Box flexDirection="column">
          {files
            .filter((f) => !f.isDir)
            .slice(0, 20)
            .map((file) => (
              <Box key={file.path} flexDirection="row" gap={1}>
                <Text color={colors.muted}>├─</Text>
                <Text color={colors.fg}>{file.name}</Text>
                <Text color={colors.muted}>({formatSize(file.size)})</Text>
              </Box>
            ))}
          {files.filter((f) => !f.isDir).length > 20 && (
            <Text color={colors.muted}>
              ...and {files.filter((f) => !f.isDir).length - 20} more
            </Text>
          )}
        </Box>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={colors.muted}
        padding={1}
        flexGrow={1}
        marginLeft={1}
      >
        <Box marginBottom={1}>
          <Text bold color={colors.success}>
            Proposed Structure
          </Text>
        </Box>
        <Box flexDirection="column">
          {results.map((group) => (
            <Box key={group.category} flexDirection="column">
              <Text bold color={colors.highlight}>
                {group.category}/ ({group.files.length} files)
              </Text>
              {group.files.slice(0, 3).map((file) => (
                <Box key={file.path} flexDirection="row" gap={1} paddingLeft={2}>
                  <Text color={colors.muted}>├─</Text>
                  <Text color={colors.fg}>{file.name}</Text>
                </Box>
              ))}
              {group.files.length > 3 && (
                <Box paddingLeft={2}>
                  <Text color={colors.muted}>...{group.files.length - 3} more</Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Box>

      <Box
        position="absolute"
        bottom={3}
        left={0}
        right={0}
        flexDirection="row"
        justifyContent="space-between"
        borderTop={true}
        borderColor={colors.muted}
        paddingTop={1}
      >
        <Box flexDirection="row" gap={2}>
          <Text color={colors.muted}>Mode:</Text>
          <Text color={mode === 'flat' ? colors.accent : colors.muted}>1:Flat</Text>
          <Text color={mode === 'extension' ? colors.accent : colors.muted}>2:Ext</Text>
          <Text color={mode === 'smart' ? colors.accent : colors.muted}>3:Smart</Text>
        </Box>
        <Box flexDirection="row" gap={2}>
          <Text>{totalFiles} files</Text>
          <Text color={colors.muted}>→</Text>
          <Text color={colors.success}>{totalFolders} folders</Text>
          <Text color={colors.muted}>({formatSize(totalSize)})</Text>
        </Box>
      </Box>
    </Box>
  );
}
