import React, {useState, useCallback, useEffect} from 'react';
import {Box, Text, useInput, useApp} from 'ink';
import {FolderPicker} from './folderPicker.js';
import {Preview} from './preview.js';
import {Confirm} from './confirm.js';
import {Progress} from './progress.js';
import {Completed} from './completed.js';
import {GlobalPreview} from './globalPreview.js';
import {GlobalConfirm} from './globalConfirm.js';
import {GlobalProgress} from './globalProgress.js';
import {GlobalCompleted} from './globalCompleted.js';
import {FileEntry, GroupingResult, FolderResult, GroupingMode, OrganizeConfig, Screen} from '../types.js';
import {scanDirectory} from '../utils/scanner.js';
import {groupFiles} from '../utils/organizer.js';
import {loadConfig} from '../utils/config.js';
import {colors} from './styles.js';

interface AppState {
  screen: Screen;
  selectedFolder: string | null;
  files: FileEntry[];
  results: GroupingResult[];
  mode: GroupingMode;
  config: OrganizeConfig;
  showHelp: boolean;
  moveResult: {moved: number; errors: string[]} | null;
  globalMode: boolean;
  folderResults: FolderResult[];
  globalMoveResult: {totalMoved: number; errors: string[]} | null;
}

interface AppProps {
  initialFolder?: string | null;
  isGlobal?: boolean;
}

export function App({initialFolder, isGlobal}: AppProps) {
  const {exit} = useApp();
  const [state, setState] = useState<AppState>({
    screen: isGlobal ? 'globalPreview' : (initialFolder ? 'preview' : 'folderPicker'),
    selectedFolder: initialFolder || null,
    files: [],
    results: [],
    mode: 'smart',
    config: loadConfig(),
    showHelp: false,
    moveResult: null,
    globalMode: isGlobal || false,
    folderResults: [],
    globalMoveResult: null,
  });

  const handleFolderSelect = useCallback(async (folder: string) => {
    setState((s) => ({...s, selectedFolder: folder, screen: 'preview'}));

    const files = await scanDirectory(folder);
    setState((s) => {
      const results = groupFiles(files, s.mode, folder, s.config.rules);
      return {...s, files, results};
    });
  }, []);

  const handleGlobalScan = useCallback(async () => {
    const folders = state.config.globalFolders;
    const folderResults: FolderResult[] = [];

    for (const folderPath of folders) {
      try {
        const stat = await import('fs').then((fs) => fs.promises.stat(folderPath));
        if (!stat.isDirectory()) continue;
      } catch {
        continue;
      }

      const files = await scanDirectory(folderPath);
      const onlyFiles = files.filter((f) => !f.isDir);
      if (onlyFiles.length === 0) continue;

      const results = groupFiles(onlyFiles, state.mode, folderPath, state.config.rules);
      const folderName = folderPath.split('/').pop() || folderPath;
      folderResults.push({
        folderPath,
        folderName,
        results,
        totalFiles: onlyFiles.length,
      });
    }

    setState((s) => ({...s, folderResults}));
  }, [state.config.globalFolders, state.mode, state.config.rules]);

  useEffect(() => {
    if (isGlobal) {
      handleGlobalScan();
    }
  }, []);

  useEffect(() => {
    if (initialFolder) {
      handleFolderSelect(initialFolder);
    }
  }, []);

  const handleModeChange = useCallback((mode: GroupingMode) => {
    setState((s) => {
      if (s.globalMode) {
        const folderResults = s.folderResults.map((fr) => ({
          ...fr,
          results: groupFiles(
            fr.results.flatMap((r) => r.files),
            mode,
            fr.folderPath,
            s.config.rules
          ),
        }));
        return {...s, mode, folderResults};
      }
      const results = groupFiles(s.files, mode, s.selectedFolder!, s.config.rules);
      return {...s, mode, results};
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState((s) => ({
      ...s,
      screen: s.globalMode ? 'globalConfirm' : 'confirm',
    }));
  }, []);

  const handleExecute = useCallback(() => {
    setState((s) => ({
      ...s,
      screen: s.globalMode ? 'globalProgress' : 'progress',
    }));
  }, []);

  const handleComplete = useCallback((result: {moved: number; errors: string[]}) => {
    setState((s) => ({...s, screen: 'completed', moveResult: result}));
  }, []);

  const handleGlobalComplete = useCallback((result: {totalMoved: number; errors: string[]}) => {
    setState((s) => ({...s, screen: 'globalCompleted', globalMoveResult: result}));
  }, []);

  const handleBack = useCallback(() => {
    setState((s) => {
      if (s.screen === 'confirm') return {...s, screen: 'preview'};
      if (s.screen === 'preview') return {...s, screen: 'folderPicker'};
      if (s.screen === 'globalConfirm') return {...s, screen: 'globalPreview'};
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
    <Box flexDirection="column" width="100%" height="100%" padding={1}>
      <Box
        flexDirection="row"
        justifyContent="space-between"
        borderBottom={true}
        borderColor={colors.muted}
        paddingBottom={1}
      >
        <Box flexDirection="row" gap={1}>
          <Text bold color={colors.cyan}>✦</Text>
          <Text bold color={colors.accent}>sift</Text>
          <Text color={colors.muted}>v0.1.0</Text>
        </Box>
        <Text color={colors.muted}>
          {state.globalMode
            ? `${state.folderResults.length} folders loaded`
            : (state.selectedFolder || 'No folder selected')}
        </Text>
        <Box flexDirection="row" gap={1}>
          {state.globalMode && (
            <>
              <Text color={colors.warning}>GLOBAL</Text>
              <Text color={colors.muted}>|</Text>
            </>
          )}
          <Text color={colors.muted}>Mode:</Text>
          <Text color={colors.highlight}>{state.mode}</Text>
        </Box>
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

        {state.screen === 'globalPreview' && (
          <GlobalPreview
            folderResults={state.folderResults}
            mode={state.mode}
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

        {state.screen === 'globalConfirm' && (
          <GlobalConfirm
            folderResults={state.folderResults}
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

        {state.screen === 'globalProgress' && (
          <GlobalProgress
            folderResults={state.folderResults}
            onComplete={handleGlobalComplete}
          />
        )}

        {state.screen === 'completed' && state.moveResult && (
          <Completed
            result={state.moveResult}
            onRestart={() => setState((s) => ({...s, screen: 'folderPicker', files: [], results: []}))}
          />
        )}

        {state.screen === 'globalCompleted' && state.globalMoveResult && (
          <GlobalCompleted
            result={state.globalMoveResult}
            onRestart={() => setState((s) => ({...s, screen: 'folderPicker', globalMode: false, folderResults: []}))}
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
          <Box borderStyle="double" borderColor={colors.accent} padding={2} flexDirection="column" gap={1}>
            <Text bold color={colors.accent}>✦ sift — Keyboard Shortcuts</Text>
            <Box marginTop={1}>
              <Text bold color={colors.highlight}>Navigation</Text>
            </Box>
            <Text>j/k or ↑/↓ — Navigate</Text>
            <Text>Enter — Select / Confirm</Text>
            <Text>Tab — Switch panel</Text>
            <Box marginTop={1}>
              <Text bold color={colors.highlight}>Actions</Text>
            </Box>
            <Text>1/2/3 — Switch mode (Flat/Ext/Smart)</Text>
            <Text>~ — Go to home directory</Text>
            <Text>y — Execute organization</Text>
            <Text>b — Go back</Text>
            <Box marginTop={1}>
              <Text bold color={colors.highlight}>General</Text>
            </Box>
            <Text>q or Ctrl+C — Quit</Text>
            <Text>Esc — Close this help</Text>
          </Box>
        </Box>
      )}

      <Box
        flexDirection="row"
        justifyContent="space-between"
        borderTop={true}
        borderColor={colors.muted}
        paddingTop={1}
      >
        <Box flexDirection="row" gap={1}>
          <Text color={colors.cyan}>?</Text>
          <Text color={colors.muted}>Help</Text>
          <Text color={colors.muted}>|</Text>
          <Text color={colors.cyan}>q</Text>
          <Text color={colors.muted}>Quit</Text>
        </Box>
        <Text color={colors.muted}>
          {(state.screen === 'preview' || state.screen === 'globalPreview') && '1/2/3: Mode | Enter: Confirm'}
          {(state.screen === 'confirm' || state.screen === 'globalConfirm') && 'y: Execute | b: Back'}
          {state.screen === 'folderPicker' && 'Enter: Select | ~: Home'}
        </Text>
      </Box>
    </Box>
  );
}
