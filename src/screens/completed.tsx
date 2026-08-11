import React from 'react';
import {Box, Text, useInput, useApp} from 'ink';
import {colors, boxStyles} from './styles';

interface CompletedProps {
  result: {moved: number; errors: string[]};
  onRestart: () => void;
}

export function Completed({result, onRestart}: CompletedProps) {
  const {exit} = useApp();

  useInput((input) => {
    if (input === 'r') onRestart();
    if (input === 'q') exit();
  });

  const hasErrors = result.errors.length > 0;

  return (
    <Box {...boxStyles.content} justifyContent="center" alignItems="center">
      <Box
        flexDirection="column"
        border={true}
        borderColor={hasErrors ? colors.warning : colors.success}
        padding={2}
        gap={1}
        width="50%"
      >
        <Text bold color={hasErrors ? colors.warning : colors.success} marginBottom={1}>
          {hasErrors ? 'Completed with errors' : 'Organization Complete!'}
        </Text>

        <Box flexDirection="column" gap={1}>
          <Text>
            Files moved: <Text bold color={colors.accent}>{result.moved}</Text>
          </Text>

          {hasErrors && (
            <Box flexDirection="column" marginTop={1}>
              <Text color={colors.error}>
                Errors ({result.errors.length}):
              </Text>
              {result.errors.slice(0, 5).map((err, i) => (
                <Text key={i} color={colors.muted}>
                  {err}
                </Text>
              ))}
              {result.errors.length > 5 && (
                <Text color={colors.muted}>
                  ...and {result.errors.length - 5} more
                </Text>
              )}
            </Box>
          )}
        </Box>

        <Box marginTop={2} justifyContent="center" gap={3}>
          <Text color={colors.accent}>r — Restart</Text>
          <Text color={colors.muted}>q — Quit</Text>
        </Box>
      </Box>
    </Box>
  );
}
