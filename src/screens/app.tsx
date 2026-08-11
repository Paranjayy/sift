import React, {useState, useEffect, useCallback} from 'react';
import {Box, Text, useInput, useApp} from 'ink';
import {FolderPicker} from './folderPicker';
import {Preview} from './preview';
import {Confirm} from './confirm';
import {Progress} from './progress';
import {Completed} from './completed';
import {FileEntry, GroupingResult, GroupingMode, OrganizeConfig, Screen} from '../types';
import {scanDirectory, computeStats} from '../utils/scanner';
import {groupFiles} from '../utils/organizer';
import {loadConfig} from '../utils/config';
import {colors, boxStyles} from './styles';

interface AppState {
  screen: Screen;
  selectedFolder: string | null;
  files: FileEntry[];
  results: GroupingResult[];
  mode: GroupingMode;
  config: OrganizeConfig;
  showHelp: boolean;
  moveResult: {moved: number; errors: string[]} | null;
}

export function App() {
  const {exit} = useApp();
  const [state, setState] = useState<AppState>({
    screen: 'folderPicker',
    selectedFolder: null,
    files: [],
    results: [],
    mode: 'smart',
    config: loadConfig(),
    showHelp: false,
    moveResult: null,
  });

  const handleFolderSelect = useCallback(async (folder: string) => {
    setState((s) => ({...s, selectedFolder: folder, screen: 'preview'}));

    const files = await scanDirectory(folder);
    const results = groupFiles(files, state.mode, folder, state.config.rules);

    setState((s) => ({...s, files, results}));
  }, [state.mode, state.config.rules]);

  const handleModeChange = useCallback((mode: GroupingMode) => {
    setState((s) => {
      const results = groupFiles(s.files, mode, s.selectedFolder!, s.config.rules);
      return {...s, mode, results};
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState((s) => ({...s, screen: 'confirm'}));
  }, []);

  const handleExecute = useCallback(() => {
    setState((s) => ({...s, screen: 'progress'}));
  }, []);

  const handleComplete = useCallback((result: {moved: number; errors: string[]}) => {
    setState((s) => ({...s, screen: 'completed', moveResult: result}));
  }, []);

  const handleBack = useCallback(() => {
    setState((s) => {
      if (s.screen === 'confirm') return {...s, screen: 'preview'};
      if (s.screen === 'preview') return {...s, screen: 'folderPicker'};
      return s;
    });
  }, []);

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
    }
    if (input === '?') {
      setState((s) => ({...s, showHelp: !s.showHelp}));
    }
    if (key.escape) {
      setState((s) => ({...s, showHelp: false}));
    }
  });

  return (
    <Box {...boxStyles.app}>
      <Box {...boxStyles.header}>
        <Text bold color={colors.accent}>
          ✦ Organize
        </Text>
        <Text color={colors.muted}>
          {state.selectedFolder || 'No folder selected'}
        </Text>
        <Text color={colors.muted}>
          Mode: {state.mode}
        </Text>
      </Box>

      <Box flexGrow={1}>
        {state.screen === 'folderPicker' && (
          <FolderPicker onSelect={handleFolderSelect} config={state.config} />
        )}

        {state.screen === 'preview' && state.selectedFolder && (
          <Preview
            files={state.files}
            results={state.results}
            mode={state.mode}
            basePath={state.selectedFolder}
            onModeChange={handleModeChange}
            onConfirm={handleConfirm}
            onBack={handleBack}
          />
        )}

        {state.screen === 'confirm' && state.selectedFolder && (
          <Confirm
            results={state.results}
            basePath={state.selectedFolder}
            onExecute={handleExecute}
            onBack={handleBack}
          />
        )}

        {state.screen === 'progress' && state.selectedFolder && (
          <Progress
            results={state.results}
            basePath={state.selectedFolder}
            onComplete={handleComplete}
          />
        )}

        {state.screen === 'completed' && state.moveResult && (
          <Completed
            result={state.moveResult}
            onRestart={() => setState((s) => ({...s, screen: 'folderPicker', files: [], results: []}))}
          />
        )}
      </Box>

      {state.showHelp && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          backgroundColor={colors.bg}
        >
          <Box border={true} borderColor={colors.accent} padding={2} flexDirection="column" gap={1}>
            <Text bold color={colors.accent}>Keyboard Shortcuts</Text>
            <Text>j/k or ↑/↓ — Navigate</Text>
            <Text>Enter — Select</Text>
            <Text>Tab — Switch panel</Text>
            <Text>1/2/3 — Switch mode</Text>
            <Text>/ — Jump to path</Text>
            <Text>q — Quit</Text>
            <Text>Esc — Close help</Text>
          </Box>
        </Box>
      )}

      <Box {...boxStyles.footer}>
        <Text color={colors.muted}>
          ?: Help | q: Quit
        </Text>
        <Text color={colors.muted}>
          {state.screen === 'preview' && '1/2/3: Mode | Enter: Confirm'}
          {state.screen === 'confirm' && 'y: Execute | b: Back'}
        </Text>
      </Box>
    </Box>
  );
}
