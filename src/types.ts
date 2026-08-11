export interface FileEntry {
  name: string;
  path: string;
  ext: string;
  size: number;
  isDir: boolean;
  modified: Date;
}

export interface GroupingResult {
  category: string;
  files: FileEntry[];
  destination: string;
}

export type GroupingMode = 'flat' | 'extension' | 'smart' | 'custom';

export interface OrganizeConfig {
  defaultMode: GroupingMode;
  showHidden: boolean;
  dryRun: boolean;
  exclude: string[];
  rules: CustomRule[];
}

export interface CustomRule {
  name: string;
  pattern?: string;
  extensions?: string[];
  destination: string;
}

export interface OrganizeStats {
  totalFiles: number;
  totalDirs: number;
  totalSize: number;
  byExtension: Map<string, { count: number; size: number }>;
  byCategory: Map<string, { count: number; size: number }>;
}

export type Screen =
  | 'folderPicker'
  | 'preview'
  | 'confirm'
  | 'progress'
  | 'completed';
