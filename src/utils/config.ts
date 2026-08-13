import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { OrganizeConfig, GroupingMode, CustomRule } from '../types.js';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'sift');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.yaml');

const DEFAULT_GLOBAL_FOLDERS = [
  path.join(os.homedir(), 'Downloads'),
  path.join(os.homedir(), 'Desktop'),
  path.join(os.homedir(), 'Documents'),
];

const DEFAULT_CONFIG: OrganizeConfig = {
  defaultMode: 'smart',
  showHidden: false,
  dryRun: true,
  exclude: ['.DS_Store', 'Thumbs.db', '.git', 'node_modules', '.cache'],
  rules: [],
  globalFolders: DEFAULT_GLOBAL_FOLDERS,
};

export function loadConfig(): OrganizeConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return parseYaml(content);
    }
  } catch {
    // Config not found or invalid, use defaults
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: OrganizeConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const yaml = toYaml(config);
  fs.writeFileSync(CONFIG_FILE, yaml, 'utf-8');
}

function parseYaml(content: string): OrganizeConfig {
  const config = { ...DEFAULT_CONFIG, globalFolders: [...DEFAULT_GLOBAL_FOLDERS] };
  const lines = content.split('\n');

  let inGlobalFolders = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();

    if (key === 'global_folders') {
      inGlobalFolders = true;
      if (value === '' || value === '[]') {
        inGlobalFolders = false;
      }
      continue;
    }

    if (inGlobalFolders) {
      if (trimmed.startsWith('-')) {
        const folder = trimmed.slice(1).trim().replace(/^["']|["']$/g, '');
        const expanded = folder.replace(/^~/, os.homedir());
        if (!config.globalFolders.includes(expanded)) {
          config.globalFolders.push(expanded);
        }
      } else {
        inGlobalFolders = false;
      }
    }

    switch (key) {
      case 'default_mode':
        config.defaultMode = value as GroupingMode;
        break;
      case 'show_hidden':
        config.showHidden = value === 'true';
        break;
      case 'dry_run':
        config.dryRun = value === 'true';
        break;
    }
  }

  return config;
}

function toYaml(config: OrganizeConfig): string {
  let yaml = `# Organize config\n`;
  yaml += `default_mode: ${config.defaultMode}\n`;
  yaml += `show_hidden: ${config.showHidden}\n`;
  yaml += `dry_run: ${config.dryRun}\n`;
  yaml += `exclude:\n`;
  for (const ex of config.exclude) {
    yaml += `  - "${ex}"\n`;
  }
  yaml += `global_folders:\n`;
  for (const folder of config.globalFolders) {
    const displayPath = folder.startsWith(os.homedir()) ? `~${folder.slice(os.homedir().length)}` : folder;
    yaml += `  - "${displayPath}"\n`;
  }
  if (config.rules.length > 0) {
    yaml += `rules:\n`;
    for (const rule of config.rules) {
      yaml += `  - name: "${rule.name}"\n`;
      if (rule.pattern) yaml += `    pattern: "${rule.pattern}"\n`;
      if (rule.extensions) yaml += `    extensions: [${rule.extensions.join(', ')}]\n`;
      yaml += `    destination: "${rule.destination}"\n`;
    }
  }
  return yaml;
}
