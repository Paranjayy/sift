import React, {useState} from 'react';
import {Box, Text, useInput, useStdout} from 'ink';
import {RepoInfo} from '../utils/git.js';
import {colors} from './styles.js';

interface RepoSelectProps {
  repos: RepoInfo[];
  runBackup: (selected: RepoInfo[], action: BackupAction) => Promise<unknown>;
  onDone: (results: unknown) => void;
  onCancel: () => void;
}

export type BackupAction = 'backup' | 'nuke' | 'prune';

const ACTION_LABEL: Record<BackupAction, string> = {
  backup: 'backup only',
  nuke: 'backup + nuke',
  prune: 'backup + prune junk',
};

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s.padEnd(n);
}

export function RepoSelect({repos, runBackup, onDone, onCancel}: RepoSelectProps) {
  const {stdout} = useStdout();
  const cols = stdout?.columns ?? 100;
  const rows = stdout?.rows ?? 24;

  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(repos.filter((r) => !r.hasRemote).map((r) => r.path))
  );
  const [action, setAction] = useState<BackupAction>('backup');
  const [phase, setPhase] = useState<'pick' | 'confirm' | 'running'>('pick');
  const [done, setDone] = useState(false);

  const nameW = Math.max(12, Math.floor(cols * 0.28));
  const stateW = Math.max(8, Math.floor(cols * 0.1));
  const remoteW = Math.max(8, cols - nameW - stateW - 22);

  const visible = Math.max(4, rows - 10);
  const start = Math.max(0, Math.min(index - Math.floor(visible / 2), repos.length - visible));
  const shown = repos.slice(start, start + visible);
  const topHidden = start;
  const bottomHidden = repos.length - (start + shown.length);

  const toggleAll = (value: boolean) => {
    setChecked(new Set(value ? repos.map((r) => r.path) : []));
  };

  const cycleAction = (dir: number) => {
    setAction((a) => {
      const order: BackupAction[] = ['backup', 'nuke', 'prune'];
      const i = order.indexOf(a);
      return order[(i + dir + order.length) % order.length];
    });
  };

  useInput((input, key) => {
    if (phase === 'running') return;

    if (phase === 'confirm') {
      if (key.escape || input === 'b') {
        setPhase('pick');
        return;
      }
      if (input === 'm' || key.rightArrow) {
        cycleAction(1);
        return;
      }
      if (key.leftArrow) {
        cycleAction(-1);
        return;
      }
      if (key.return) {
        const selected = repos.filter((r) => checked.has(r.path));
        if (selected.length === 0) return;
        setPhase('running');
        runBackup(selected, action).then((results) => {
          setDone(true);
          onDone(results);
        });
        return;
      }
      return;
    }

    if (key.upArrow || input === 'k') {
      setIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow || input === 'j') {
      setIndex((i) => Math.min(repos.length - 1, i + 1));
      return;
    }
    if (input === ' ') {
      const current = repos[index];
      setChecked((prev) => {
        const next = new Set(prev);
        if (next.has(current.path)) next.delete(current.path);
        else next.add(current.path);
        return next;
      });
      return;
    }
    if (key.return) {
      setPhase('confirm');
      return;
    }
    if (input === 'm') {
      cycleAction(1);
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

  if (phase === 'running' && done) return null;

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
          <Text bold color={colors.accent}>sift backup — select repos</Text>
          <Text color={colors.muted}>{checked.size}/{repos.length} selected · action: {ACTION_LABEL[action]}</Text>
        </Box>

        {phase === 'confirm' ? (
          <Box flexDirection="column" gap={1} paddingY={1}>
            <Text color={colors.fg}>
              Back up <Text bold color={colors.cyan}>{checked.size}</Text> repo{checked.size === 1 ? '' : 's'}?
            </Text>
            <Box flexDirection="row" gap={1}>
              <Text color={colors.muted}>Action:</Text>
              <Text bold color={colors.highlight}>m — {ACTION_LABEL[action]}</Text>
            </Box>
            <Text color={action === 'backup' ? colors.muted : colors.warning}>
              {action === 'nuke'
                ? 'Snapshots each repo to a tar, then moves the whole folder to Trash.'
                : action === 'prune'
                  ? 'Archives untracked+ignored files, then Trashes gitignored junk — keeps your source.'
                  : 'Creates private GitHub repo / local bundle. Nothing is removed.'}
            </Text>
            <Box marginTop={1}>
              <Text color={colors.muted}>Enter: run | m: cycle action | Esc: back</Text>
            </Box>
          </Box>
        ) : (
          <Box flexDirection="column">
            {topHidden > 0 && <Text color={colors.muted}>… {topHidden} more above</Text>}
            {shown.map((repo) => {
              const isChecked = checked.has(repo.path);
              const isSelected = index === repos.indexOf(repo);
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
                    {truncate(repo.name, nameW)}
                  </Text>
                  <Text color={colors.muted}>{truncate(repo.branch, 8)}</Text>
                  <Text color={repo.dirty ? colors.warning : colors.muted}>
                    {truncate(state, stateW)}
                  </Text>
                  <Text color={colors.muted}>{truncate(repo.remote || '—', remoteW)}</Text>
                </Box>
              );
            })}
            {bottomHidden > 0 && <Text color={colors.muted}>… {bottomHidden} more below</Text>}
          </Box>
        )}

        {phase !== 'confirm' && (
          <Box marginTop={1}>
            <Text color={colors.muted}>
              j/k: move | Space: toggle | a/A: all/none | m: action | Enter: next | q: quit
            </Text>
          </Box>
        )}
      </Box>

      {phase === 'running' && (
        <Box marginTop={1}>
          <Text color={colors.cyan}>Running {ACTION_LABEL[action]} on {checked.size} repo{checked.size === 1 ? '' : 's'}…</Text>
        </Box>
      )}
    </Box>
  );
}