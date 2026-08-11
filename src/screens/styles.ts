import {BoxProps} from 'ink';

export const colors = {
  bg: '#1a1b26',
  fg: '#c0caf5',
  muted: '#565f89',
  accent: '#7aa2f7',
  success: '#9ece6a',
  warning: '#e0af68',
  error: '#f7768e',
  highlight: '#bb9af7',
  cyan: '#7dcfff',
  orange: '#ff9e64',
} as const;

export const boxStyles: Record<string, BoxProps> = {
  app: {
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    padding: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: true,
    borderColor: colors.muted,
    paddingBottom: 1,
  },
  content: {
    flexDirection: 'row',
    flexGrow: 1,
  },
  sidebar: {
    flexDirection: 'column',
    width: '30%',
    borderRight: true,
    borderColor: colors.muted,
    paddingRight: 1,
  },
  main: {
    flexDirection: 'column',
    flexGrow: 1,
    paddingLeft: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: true,
    borderColor: colors.muted,
    paddingTop: 1,
  },
  statsBar: {
    flexDirection: 'row',
    gap: 2,
  },
  panel: {
    flexDirection: 'column',
    border: true,
    borderColor: colors.muted,
    padding: 1,
    flexGrow: 1,
  },
  listItem: {
    flexDirection: 'row',
    gap: 1,
  },
};

export const shortcuts = {
  navigation: [
    {key: 'j/k', desc: 'Navigate'},
    {key: '↑/↓', desc: 'Move'},
    {key: 'Enter', desc: 'Select'},
    {key: 'Tab', desc: 'Switch panel'},
  ],
  actions: [
    {key: '1/2/3', desc: 'Mode'},
    {key: '/', desc: 'Path'},
    {key: '?', desc: 'Help'},
    {key: 'q', desc: 'Quit'},
  ],
  confirm: [
    {key: 'y', desc: 'Yes'},
    {key: 'n', desc: 'No'},
    {key: 'b', desc: 'Back'},
  ],
};
