import React, {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import {FolderResult} from '../types.js';
import {executeOrganize} from '../utils/organizer.js';
import {colors, boxStyles} from './styles.js';

interface GlobalProgressProps {
  folderResults: FolderResult[];
  onComplete: (result: {totalMoved: number; errors: string[]}) => void;
}

export function GlobalProgress({folderResults, onComplete}: GlobalProgressProps) {
  const [currentFolder, setCurrentFolder] = useState('');
  const [currentFile, setCurrentFile] = useState('');
  const [done, setDone] = useState(0);
  const [total] = useState(
    folderResults.reduce(
      (acc, fr) => acc + fr.results.reduce((a, r) => a + r.files.length, 0),
      0
    )
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [completedFolders, setCompletedFolders] = useState(0);

  useEffect(() => {
    const run = async () => {
      let allErrors: string[] = [];
      let totalMoved = 0;

      for (let i = 0; i < folderResults.length; i++) {
        const fr = folderResults[i];
        setCurrentFolder(fr.folderName);

        const result = await executeOrganize(fr.results, fr.folderPath, (fileName, _total, completed) => {
          setCurrentFile(fileName);
          setDone(totalMoved + completed);
        });

        totalMoved += result.moved;
        allErrors = [...allErrors, ...result.errors];
        setErrors(allErrors);
        setCompletedFolders(i + 1);
      }

      onComplete({totalMoved, errors: allErrors});
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
          Global Organizing...
        </Text>

        <Box flexDirection="column" gap={1}>
          <Text color={colors.muted}>
            Folder {completedFolders + 1}/{folderResults.length}: <Text color={colors.highlight}>{currentFolder}</Text>
          </Text>

          <Text color={colors.muted}>
            [{Array(filled).fill('█').join('')}{Array(barWidth - filled).fill('░').join('')}]
          </Text>
          <Text>
            {done}/{total} files ({Math.round(progress)}%)
          </Text>
          {currentFile && (
            <Text color={colors.muted}>
              Current: {currentFile}
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
