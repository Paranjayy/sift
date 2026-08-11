import React from 'react';
import {Box, Text, useInput} from 'ink';
import {GroupingResult} from '../types';
import {colors, boxStyles} from './styles';

interface ConfirmProps {
  results: GroupingResult[];
  basePath: string;
  onExecute: () => void;
  onBack: () => void;
}

export function Confirm({results, basePath, onExecute, onBack}: ConfirmProps) {
  const totalFiles = results.reduce((acc, r) => acc + r.files.length, 0);
  const totalFolders = results.length;

  useInput((input, key) => {
    if (input === 'y' || input === 'Y') onExecute();
    if (key.backspace || input === 'n') onBack();
  });

  return (
    <Box {...boxStyles.content} justifyContent="center" alignItems="center">
      <Box
        flexDirection="column"
        border={true}
        borderColor={colors.warning}
        padding={2}
        gap={1}
        width="60%"
      >
        <Text bold color={colors.warning} marginBottom={1}>
          Confirm Organization
        </Text>

        <Text>
          Move <Text bold color={colors.accent}>{totalFiles}</Text> files into{' '}
          <Text bold color={colors.success}>{totalFolders}</Text> folders?
        </Text>

        <Box flexDirection="column" marginTop={1} gap={0}>
          {results.map((group) => (
            <Box key={group.category} flexDirection="row" gap={1}>
              <Text color={colors.muted}>├─</Text>
              <Text color={colors.highlight}>{group.category}/</Text>
              <Text color={colors.muted}>({group.files.length} files)</Text>
            </Box>
          ))}
        </Box>

        <Box marginTop={1} flexDirection="row" gap={2}>
          <Text color={colors.muted}>From:</Text>
          <Text>{basePath}</Text>
        </Box>

        <Box marginTop={2} justifyContent="center" gap={3}>
          <Text color={colors.success} bold>y — Execute</Text>
          <Text color={colors.muted}>b — Back</Text>
          <Text color={colors.error}>n — Cancel</Text>
        </Box>
      </Box>
    </Box>
  );
}
