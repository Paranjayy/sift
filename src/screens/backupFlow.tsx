import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {findGitRepos, inspectRepos, type RepoInfo} from '../utils/git.js';
import {RepoSelect} from './repoSelect.js';
import {colors} from './styles.js';

interface BackupFlowProps {
  runBackup: (selected: RepoInfo[]) => Promise<unknown>;
  onDone: (results: unknown) => void;
  onCancel: () => void;
}

interface Scope {
  label: string;
  root: string;
  depth: number;
  custom?: boolean;
}

function defaultScopes(): Scope[] {
  const dev = path.join(os.homedir(), 'Developer');
  const devRoot = fs.existsSync(dev) ? dev : os.homedir();
  return [
    {label: `Developer — ${devRoot}`, root: devRoot, depth: 6},
    {label: 'Home — ~', root: os.homedir(), depth: 6},
    {label: 'Everywhere — deep scan of home', root: os.homedir(), depth: 12},
    {label: 'Custom path…', root: '', depth: 8, custom: true},
  ];
}

type Phase = 'scope' | 'custom' | 'loading' | 'pick';

export function BackupFlow({runBackup, onDone, onCancel}: BackupFlowProps) {
  const [phase, setPhase] = useState<Phase>('scope');
  const [scopeIndex, setScopeIndex] = useState(0);
  const [customPath, setCustomPath] = useState('');
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [status, setStatus] = useState('');
  const scopes = defaultScopes();

  const runScan = async (scope: Scope) => {
    setPhase('loading');
    setStatus(`Scanning ${scope.root} (depth ${scope.depth})…`);
    const repoPaths = await findGitRepos(scope.root, scope.depth);
    const found = await inspectRepos(repoPaths);
    setRepos(found);
    setPhase('pick');
  };

  useInput((input, key) => {
    if (phase === 'scope') {
      if (key.upArrow || input === 'k') {
        setScopeIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow || input === 'j') {
        setScopeIndex((i) => Math.min(scopes.length - 1, i + 1));
        return;
      }
      if (key.return) {
        const scope = scopes[scopeIndex];
        if (scope.custom) {
          setPhase('custom');
        } else {
          runScan(scope);
        }
        return;
      }
      if (input === 'q' || key.escape) {
        onCancel();
      }
      return;
    }

    if (phase === 'custom') {
      if (key.escape) {
        setPhase('scope');
        return;
      }
      if (key.return) {
        if (customPath.trim()) {
          runScan({label: customPath, root: customPath.trim(), depth: 8});
        }
        return;
      }
      if (key.backspace) {
        setCustomPath((p) => p.slice(0, -1));
        return;
      }
      if (input) {
        setCustomPath((p) => p + input);
      }
      return;
    }
  });

  if (phase === 'scope') {
    return (
      <Box flexDirection="column" flexGrow={1} padding={1}>
        <Box marginBottom={1}>
          <Text bold color={colors.accent}>sift backup — where should we scan?</Text>
        </Box>
        {scopes.map((scope, i) => (
          <Box key={scope.label} flexDirection="row" gap={1}>
            <Text color={i === scopeIndex ? colors.accent : undefined}>
              {i === scopeIndex ? '▸ ' : '  '}
            </Text>
            <Text color={i === scopeIndex ? colors.fg : colors.muted}>{scope.label}</Text>
          </Box>
        ))}
        <Box marginTop={1}>
          <Text color={colors.muted}>j/k: move | Enter: pick | q: quit</Text>
        </Box>
      </Box>
    );
  }

  if (phase === 'custom') {
    return (
      <Box flexDirection="column" flexGrow={1} padding={1}>
        <Text bold color={colors.accent}>Type a folder path to scan</Text>
        <Box flexDirection="row" gap={1}>
          <Text color={colors.cyan}>🔍</Text>
          <Text color={colors.fg}>{customPath || '…'}</Text>
        </Box>
        <Text color={colors.muted}>Enter: scan | Esc: back</Text>
      </Box>
    );
  }

  if (phase === 'loading') {
    return (
      <Box flexDirection="column" flexGrow={1} padding={1}>
        <Text color={colors.cyan}>{status}</Text>
      </Box>
    );
  }

  return (
    <RepoSelect
      repos={repos}
      runBackup={runBackup}
      onDone={onDone}
      onCancel={onCancel}
    />
  );
}