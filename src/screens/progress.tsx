import React, {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import {GroupingResult} from '../types.js';
import {executeOrganize} from '../utils/organizer.js';
import {colors, boxStyles} from './styles.js';

interface ProgressProps {
  results: GroupingResult[];
  basePath: string;
  onComplete: (result: {moved: number; errors: string[]}) => void;
}

export function Progress({results, basePath, onComplete}: ProgressProps) {
  const [current, setCurrent] = useState('');
  const [done, setDone] = useState(0);
  const [total] = useState(results.reduce((acc, r) => acc + r.files.length, 0));
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const run = async () => {
      const result = await executeOrganize(results, basePath, (fileName, _total, completed) => {
        setCurrent(fileName);
        setDone(completed);
      });

      onComplete(result);
    };

    run();
  }, []);

  const progress = total > 0 ? (done / total) * 100 : 0;
  const barWidth = 40;
  const filled = Math.round((progress / 100) * barWidth);

  return (
    <Box {...boxStyles.content} justifyContent="center" alignItems="center">
      <Box flexDirection="column" gap={2} width="60%">
        <Text bold color={colors.accent}>
          Organizing...
        </Text>

        <Box flexDirection="column" gap={1}>
          <Text color={colors.muted}>
            [{Array(filled).fill('█').join('')}{Array(barWidth - filled).fill('░').join('')}]
          </Text>
          <Text>
            {done}/{total} files ({Math.round(progress)}%)
          </Text>
          {current && (
            <Text color={colors.muted}>
              Current: {current}
            </Text>
          )}
        </Box>

        {errors.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={colors.error}>
              {errors.length} errors occurred
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
