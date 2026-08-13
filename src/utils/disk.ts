import * as fs from 'fs';
import * as path from 'path';

export interface DiskItem {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
}

async function getDirSize(dirPath: string): Promise<number> {
  let total = 0;
  const queue = [dirPath];

  while (queue.length > 0) {
    const current = queue.shift()!;
    let entries;
    try {
      entries = await fs.promises.readdir(current, {withFileTypes: true});
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules') {
          // speed up by skipping full stats if we want, but user wants actual sizes. Let's scan node_modules too but quickly.
        }
        queue.push(full);
      } else if (entry.isFile()) {
        try {
          const stat = await fs.promises.stat(full);
          total += stat.size;
        } catch {
          // ignore stat errors
        }
      }
    }
  }

  return total;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export async function analyzeDisk(rootPath: string): Promise<{items: DiskItem[]; totalSize: number}> {
  const entries = await fs.promises.readdir(rootPath, {withFileTypes: true});
  const items: DiskItem[] = [];

  const promises = entries.map(async (entry) => {
    const full = path.join(rootPath, entry.name);
    let size = 0;
    if (entry.isDirectory()) {
      size = await getDirSize(full);
    } else if (entry.isFile()) {
      try {
        const stat = await fs.promises.stat(full);
        size = stat.size;
      } catch {
        // ignore
      }
    }
    items.push({
      name: entry.name,
      path: full,
      isDir: entry.isDirectory(),
      size,
    });
  });

  await Promise.all(promises);
  
  const sorted = items.sort((a, b) => b.size - a.size);
  const totalSize = sorted.reduce((acc, item) => acc + item.size, 0);

  return {items: sorted, totalSize};
}

export function renderDiskBar(size: number, total: number, barWidth = 30): string {
  if (total === 0) return '[' + ' '.repeat(barWidth) + ']';
  const percentage = size / total;
  const filled = Math.min(barWidth, Math.round(percentage * barWidth));
  return '[' + '█'.repeat(filled) + ' '.repeat(barWidth - filled) + ']';
}

export {formatSize};