import React from 'react';
import {Box, Text, useInput} from 'ink';
import {FolderResult} from '../types.js';
import {colors} from './styles.js';

interface GlobalConfirmProps {
  folderResults: FolderResult[];
  onExecute: () => void;
  onBack: () => void;
}

export function GlobalConfirm({folderResults, onExecute, onBack}: GlobalConfirmProps) {
  const totalFiles = folderResults.reduce(
    (acc, fr) => acc + fr.results.reduce((a, r) => a + r.files.length, 0),
    0
  );
  const totalFolders = folderResults.reduce(
    (acc, fr) => acc + fr.results.length,
    0
  );

  useInput((input, key) => {
    if (input === 'y' || input === 'Y') onExecute();
    if (key.backspace || input === 'n') onBack();
  });

  return (
    <Box flexDirection="row" justifyContent="center" alignItems="center" flexGrow={1}>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={colors.warning}
        padding={2}
        gap={1}
        width="70%"
      >
        <Box marginBottom={1}>
          <Text bold color={colors.warning}>
            Confirm Global Organization
          </Text>
        </Box>

        <Text>
          Move <Text bold color={colors.accent}>{totalFiles}</Text> files across{' '}
          <Text bold color={colors.highlight}>{folderResults.length}</Text> folders into{' '}
          <Text bold color={colors.success}>{totalFolders}</Text> groups?
        </Text>

        <Box flexDirection="column" marginTop={1} gap={0}>
          {folderResults.map((fr) => {
            const folderFiles = fr.results.reduce((a, r) => a + r.files.length, 0);
            return (
              <Box key={fr.folderPath} flexDirection="column">
                <Box flexDirection="row" gap={1}>
                  <Text>📁</Text>
                  <Text bold color={colors.accent}>{fr.folderName}/</Text>
                  <Text color={colors.muted}>({folderFiles} files)</Text>
                </Box>
                <Box flexDirection="column" paddingLeft={2}>
                  {fr.results.map((group) => (
                    <Box key={group.category} flexDirection="row" gap={1}>
                      <Text color={colors.highlight}>↳ {group.category}/</Text>
                      <Text color={colors.muted}>({group.files.length})</Text>
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>

        <Box marginTop={2} justifyContent="center" gap={3}>
          <Text color={colors.success} bold>y — Execute All</Text>
          <Text color={colors.muted}>b — Back</Text>
          <Text color={colors.error}>n — Cancel</Text>
        </Box>
      </Box>
    </Box>
  );
}
