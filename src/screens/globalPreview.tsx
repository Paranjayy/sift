import React from 'react';
import {Box, Text, useInput} from 'ink';
import {FolderResult, GroupingMode} from '../types.js';
import {colors} from './styles.js';
import {getFileIcon} from '../utils/scanner.js';

interface GlobalPreviewProps {
  folderResults: FolderResult[];
  mode: GroupingMode;
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

export function GlobalPreview({folderResults, mode, onModeChange, onConfirm, onBack}: GlobalPreviewProps) {
  const totalFiles = folderResults.reduce(
    (acc, fr) => acc + fr.results.reduce((a, r) => a + r.files.length, 0),
    0
  );
  const totalFolders = folderResults.reduce(
    (acc, fr) => acc + fr.results.length,
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
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1}>
        <Text bold color={colors.warning}>
          Global Mode — {folderResults.length} folders
        </Text>
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        {folderResults.map((fr) => {
          const folderTotal = fr.results.reduce((a, r) => a + r.files.length, 0);
          return (
            <Box key={fr.folderPath} flexDirection="column" marginBottom={1}>
              <Box flexDirection="row" gap={1}>
                <Text bold color={colors.accent}>
                  📁 {fr.folderName}/
                </Text>
                <Text color={colors.muted}>
                  ({folderTotal} files → {fr.results.length} groups)
                </Text>
              </Box>
              <Box flexDirection="column" paddingLeft={2}>
                {fr.results.slice(0, 4).map((group) => {
                  const groupSize = group.files.reduce((a, f) => a + f.size, 0);
                  return (
                    <Box key={group.category} flexDirection="row" gap={1}>
                      <Text color={colors.highlight}>↳ {group.category}/</Text>
                      <Text color={colors.muted}>
                        ({group.files.length} files, {formatSize(groupSize)})
                      </Text>
                    </Box>
                  );
                })}
                {fr.results.length > 4 && (
                  <Box paddingLeft={1}>
                    <Text color={colors.muted}>...{fr.results.length - 4} more groups</Text>
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box
        flexDirection="row"
        justifyContent="space-between"
        borderTop={true}
        borderColor={colors.muted}
        paddingTop={1}
      >
        <Box flexDirection="row" gap={2}>
          <Text color={colors.warning}>DRY RUN</Text>
          <Text color={colors.muted}>|</Text>
          <Text color={colors.muted}>Mode:</Text>
          <Text color={mode === 'flat' ? colors.accent : colors.muted}>1:Flat</Text>
          <Text color={mode === 'extension' ? colors.accent : colors.muted}>2:Ext</Text>
          <Text color={mode === 'smart' ? colors.accent : colors.muted}>3:Smart</Text>
        </Box>
        <Box flexDirection="row" gap={2}>
          <Text>{totalFiles} files</Text>
          <Text color={colors.muted}>→</Text>
          <Text color={colors.success}>{totalFolders} folders</Text>
        </Box>
      </Box>
    </Box>
  );
}
