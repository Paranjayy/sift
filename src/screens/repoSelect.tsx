import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import {RepoInfo} from '../utils/git.js';
import {colors} from './styles.js';

interface RepoSelectProps {
  repos: RepoInfo[];
  runBackup: (selected: RepoInfo[]) => Promise<unknown>;
  onDone: (results: unknown) => void;
  onCancel: () => void;
}

const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n));

export function RepoSelect({repos, runBackup, onDone, onCancel}: RepoSelectProps) {
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(repos.filter((r) => !r.hasRemote).map((r) => r.path))
  );
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const toggleAll = (value: boolean) => {
    setChecked(new Set(value ? repos.map((r) => r.path) : []));
  };

  useInput((input, key) => {
    if (running) return;

    if (key.upArrow || input === 'k') {
      setIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow || input === 'j') {
      setIndex((i) => Math.min(repos.length - 1, i + 1));
      return;
    }
    if (input === ' ' || key.return) {
      const current = repos[index];
      if (input === ' ') {
        setChecked((prev) => {
          const next = new Set(prev);
          if (next.has(current.path)) next.delete(current.path);
          else next.add(current.path);
          return next;
        });
      } else {
        const selected = repos.filter((r) => checked.has(r.path));
        if (selected.length === 0) return;
        setRunning(true);
        runBackup(selected).then((results) => {
          setDone(true);
          onDone(results);
        });
      }
      return;
    }
    if (input === 'a') {
      toggleAll(true);
      return;
    }
    if (input === 'A' || input === 'x') {
      toggleAll(false);
      return;
    }
    if (input === 'q' || key.escape) {
      onCancel();
    }
  });

  if (running && done) return null;

  return (
    <Box flexDirection="column" flexGrow={1} padding={1}>
      <Box marginBottom={1} justifyContent="space-between" flexDirection="row">
        <Text bold color={colors.accent}>sift backup — select repos</Text>
        <Text color={colors.muted}>{checked.size}/{repos.length} selected</Text>
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        {repos.map((repo, i) => {
          const isChecked = checked.has(repo.path);
          const isSelected = i === index;
          const state = repo.dirty ? 'dirty' : repo.hasRemote ? 'clean' : 'no remote';
          return (
            <Box key={repo.path} flexDirection="row" gap={1}>
              <Text color={isSelected ? colors.accent : undefined}>
                {isSelected ? '▸ ' : '  '}
              </Text>
              <Text color={isChecked ? colors.cyan : colors.muted}>
                {isChecked ? '[✓]' : '[ ]'}
              </Text>
              <Text color={isSelected ? colors.fg : colors.muted}>
                {pad(repo.name, 32)}
              </Text>
              <Text color={colors.muted}>
                {pad(repo.branch, 8)}
              </Text>
              <Text color={repo.dirty ? colors.warning : colors.muted}>
                {pad(state, 10)}
              </Text>
              <Text color={colors.muted}>{repo.remote || '—'}</Text>
            </Box>
          );
        })}
      </Box>

      {running ? (
        <Box marginTop={1}>
          <Text color={colors.cyan}>Backing up {checked.size} repo{checked.size === 1 ? '' : 's'}…</Text>
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text color={colors.muted}>
            j/k: move | Space: toggle | a: all | A: none | Enter: backup selected | q: quit
          </Text>
        </Box>
      )}
    </Box>
  );
}