import * as fs from 'fs';
import * as path from 'path';
import { FileEntry, OrganizeStats } from '../types';

const DEFAULT_EXCLUDE = [
  '.DS_Store',
  'Thumbs.db',
  '.git',
  'node_modules',
  '.cache',
];

export async function scanDirectory(
  dirPath: string,
  showHidden: boolean = false,
  exclude: string[] = []
): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];
  const allExclude = [...DEFAULT_EXCLUDE, ...exclude];

  const scan = async (currentPath: string) => {
    const items = await fs.promises.readdir(currentPath, {
      withFileTypes: true,
    });

    for (const item of items) {
      if (!showHidden && item.name.startsWith('.')) continue;
      if (allExclude.includes(item.name)) continue;

      const fullPath = path.join(currentPath, item.name);
      const stat = await fs.promises.stat(fullPath);

      entries.push({
        name: item.name,
        path: fullPath,
        ext: item.isDirectory() ? '' : path.extname(item.name).toLowerCase(),
        size: stat.size,
        isDir: item.isDirectory(),
        modified: stat.mtime,
      });

      if (item.isDirectory()) {
        await scan(fullPath);
      }
    }
  };

  await scan(dirPath);
  return entries;
}

export function computeStats(files: FileEntry[]): OrganizeStats {
  const byExtension = new Map<string, { count: number; size: number }>();
  const byCategory = new Map<string, { count: number; size: number }>();

  let totalDirs = 0;

  for (const file of files) {
    if (file.isDir) {
      totalDirs++;
      continue;
    }

    const ext = file.ext || 'no-ext';
    const existing = byExtension.get(ext) || { count: 0, size: 0 };
    byExtension.set(ext, {
      count: existing.count + 1,
      size: existing.size + file.size,
    });

    const category = getCategory(file.ext);
    const catExisting = byCategory.get(category) || { count: 0, size: 0 };
    byCategory.set(category, {
      count: catExisting.count + 1,
      size: catExisting.size + file.size,
    });
  }

  return {
    totalFiles: files.length - totalDirs,
    totalDirs,
    totalSize: files.reduce((acc, f) => acc + (f.isDir ? 0 : f.size), 0),
    byExtension,
    byCategory,
  };
}

function getCategory(ext: string): string {
  const categories: Record<string, string[]> = {
    Images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico', '.tiff', '.tif'],
    Video: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v'],
    Audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.opus'],
    Documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.odt'],
    Code: ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.rb', '.php', '.swift', '.kt'],
    Archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.tgz'],
    Fonts: ['.ttf', '.otf', '.woff', '.woff2', '.eot'],
    Data: ['.json', '.xml', '.yaml', '.yml', '.csv', '.sql', '.db'],
  };

  for (const [category, extensions] of Object.entries(categories)) {
    if (extensions.includes(ext)) return category;
  }
  return 'Other';
}
