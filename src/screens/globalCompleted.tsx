import React from 'react';
import {Box, Text, useInput, useApp} from 'ink';
import {colors} from './styles.js';

interface GlobalCompletedProps {
  result: {totalMoved: number; errors: string[]};
  onRestart: () => void;
}

export function GlobalCompleted({result, onRestart}: GlobalCompletedProps) {
  const {exit} = useApp();

  useInput((input) => {
    if (input === 'r') onRestart();
    if (input === 'q') exit();
  });

  const hasErrors = result.errors.length > 0;

  return (
    <Box flexDirection="row" justifyContent="center" alignItems="center" flexGrow={1}>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={hasErrors ? colors.warning : colors.success}
        padding={2}
        gap={1}
        width="60%"
      >
        <Box marginBottom={1}>
          <Text bold color={hasErrors ? colors.warning : colors.success}>
            {hasErrors ? 'Global Organization Complete with errors' : 'Global Organization Complete!'}
          </Text>
        </Box>

        <Box flexDirection="column" gap={1}>
          <Text>
            Total files moved: <Text bold color={colors.accent}>{result.totalMoved}</Text>
          </Text>

          {hasErrors && (
            <Box flexDirection="column" marginTop={1}>
              <Text color={colors.error}>
                Errors ({result.errors.length}):
              </Text>
              {result.errors.slice(0, 8).map((err, i) => (
                <Text key={i} color={colors.muted}>
                  {err}
                </Text>
              ))}
              {result.errors.length > 8 && (
                <Text color={colors.muted}>
                  ...and {result.errors.length - 8} more
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
