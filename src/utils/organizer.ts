import * as fs from 'fs';
import * as path from 'path';
import { FileEntry, GroupingResult, GroupingMode, CustomRule } from '../types';

const SMART_CATEGORIES: Record<string, string[]> = {
  Screenshots: ['Screenshot', 'SCR-', 'Screen Shot'],
  'Wallpapers': ['.heic', '.heif'],
  Images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico', '.tiff', '.tif'],
  Video: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v'],
  Audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.opus', '.wma'],
  Documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.odt', '.pages', '.numbers', '.keynote'],
  Code: ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.rb', '.php', '.swift', '.kt', '.css', '.html'],
  Archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.tgz'],
  Fonts: ['.ttf', '.otf', '.woff', '.woff2', '.eot'],
  Data: ['.json', '.xml', '.yaml', '.yml', '.csv', '.sql', '.db', '.sqlite'],
  'Disk Images': ['.dmg', '.iso', '.img'],
};

export function groupFiles(
  files: FileEntry[],
  mode: GroupingMode,
  basePath: string,
  customRules: CustomRule[] = []
): GroupingResult[] {
  const onlyFiles = files.filter((f) => !f.isDir);

  switch (mode) {
    case 'flat':
      return groupFlat(onlyFiles, basePath);
    case 'extension':
      return groupByExtension(onlyFiles, basePath);
    case 'smart':
      return groupSmart(onlyFiles, basePath);
    case 'custom':
      return groupCustom(onlyFiles, basePath, customRules);
    default:
      return groupSmart(onlyFiles, basePath);
  }
}

function groupFlat(files: FileEntry[], basePath: string): GroupingResult[] {
  const groups = new Map<string, FileEntry[]>();

  for (const file of files) {
    const category = getSmartCategory(file.name, file.ext);
    const existing = groups.get(category) || [];
    existing.push(file);
    groups.set(category, existing);
  }

  return Array.from(groups.entries()).map(([category, categoryFiles]) => ({
    category,
    files: categoryFiles,
    destination: path.join(basePath, category),
  }));
}

function groupByExtension(files: FileEntry[], basePath: string): GroupingResult[] {
  const groups = new Map<string, FileEntry[]>();

  for (const file of files) {
    const ext = file.ext || 'no-extension';
    const folderName = ext.startsWith('.') ? ext.slice(1) : ext;
    const existing = groups.get(folderName) || [];
    existing.push(file);
    groups.set(folderName, existing);
  }

  return Array.from(groups.entries()).map(([ext, extFiles]) => ({
    category: ext,
    files: extFiles,
    destination: path.join(basePath, ext),
  }));
}

function groupSmart(files: FileEntry[], basePath: string): GroupingResult[] {
  const groups = new Map<string, FileEntry[]>();

  for (const file of files) {
    const category = getSmartCategory(file.name, file.ext);
    const existing = groups.get(category) || [];
    existing.push(file);
    groups.set(category, existing);
  }

  return Array.from(groups.entries()).map(([category, catFiles]) => ({
    category,
    files: catFiles,
    destination: path.join(basePath, category),
  }));
}

function groupCustom(
  files: FileEntry[],
  basePath: string,
  rules: CustomRule[]
): GroupingResult[] {
  const groups = new Map<string, FileEntry[]>();
  const unmatched: FileEntry[] = [];

  for (const file of files) {
    let matched = false;

    for (const rule of rules) {
      if (rule.extensions && rule.extensions.includes(file.ext)) {
        const existing = groups.get(rule.name) || [];
        existing.push(file);
        groups.set(rule.name, existing);
        matched = true;
        break;
      }

      if (rule.pattern && file.name.includes(rule.pattern)) {
        const existing = groups.get(rule.name) || [];
        existing.push(file);
        groups.set(rule.name, existing);
        matched = true;
        break;
      }
    }

    if (!matched) {
      unmatched.push(file);
    }
  }

  if (unmatched.length > 0) {
    groups.set('Unsorted', unmatched);
  }

  return Array.from(groups.entries()).map(([name, nameFiles]) => ({
    category: name,
    files: nameFiles,
    destination: path.join(basePath, name),
  }));
}

function getSmartCategory(filename: string, ext: string): string {
  // Screenshot detection
  if (filename.startsWith('Screenshot') || filename.startsWith('SCR-') || filename.startsWith('Screen Shot')) {
    return 'Screenshots';
  }

  // macOS screenshot with timestamp pattern
  if (filename.match(/^Screenshot \d{4}-\d{2}-\d{2} at/)) {
    return 'Screenshots';
  }

  // Shottr pattern
  if (filename.match(/^SCR-\d{8}/)) {
    return 'Screenshots';
  }

  for (const [category, extensions] of Object.entries(SMART_CATEGORIES)) {
    if (extensions.includes(ext)) return category;
  }
  return 'Other';
}

export async function executeOrganize(
  results: GroupingResult[],
  basePath: string,
  onProgress?: (current: string, total: number, done: number) => void
): Promise<{ moved: number; errors: string[] }> {
  let moved = 0;
  const errors: string[] = [];
  const totalFiles = results.reduce((acc, r) => acc + r.files.length, 0);

  for (const group of results) {
    await fs.promises.mkdir(group.destination, { recursive: true });

    for (const file of group.files) {
      try {
        const destPath = path.join(group.destination, file.name);
        await fs.promises.rename(file.path, destPath);
        moved++;
        onProgress?.(file.name, totalFiles, moved);
      } catch (err) {
        errors.push(`Failed to move ${file.name}: ${err}`);
      }
    }
  }

  return { moved, errors };
}
