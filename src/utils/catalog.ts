import * as fs from 'fs';
import * as path from 'path';
import {getFileIcon} from './scanner.js';
import {formatSize} from './disk.js';

interface CatalogNode {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  skipped?: boolean;
  children?: CatalogNode[];
}

const HEAVY_SKIP = new Set(['node_modules', '.git', '.cache', 'venv', '.venv', 'dist', 'build', 'target']);

async function buildCatalogTree(
  dirPath: string,
  depth: number,
  maxDepth: number
): Promise<CatalogNode> {
  const name = path.basename(dirPath) || dirPath;
  const node: CatalogNode = {name, path: dirPath, isDir: true, size: 0, children: []};

  if (HEAVY_SKIP.has(name) && depth > 0) {
    node.skipped = true;
    try {
      // Just grab size of the skipped folder quickly
      const stat = await fs.promises.stat(dirPath);
      node.size = stat.size;
    } catch {}
    return node;
  }

  if (depth > maxDepth) {
    node.skipped = true;
    return node;
  }

  let entries;
  try {
    entries = await fs.promises.readdir(dirPath, {withFileTypes: true});
  } catch {
    return node;
  }

  const childPromises = entries.map(async (entry) => {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const child = await buildCatalogTree(full, depth + 1, maxDepth);
      node.size += child.size;
      node.children!.push(child);
    } else {
      try {
        const stat = await fs.promises.stat(full);
        node.size += stat.size;
        node.children!.push({
          name: entry.name,
          path: full,
          isDir: false,
          size: stat.size,
        });
      } catch {}
    }
  });

  await Promise.all(childPromises);
  node.children!.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return node;
}

function compileMarkdown(node: CatalogNode, indent = 0): string {
  const spaces = '  '.repeat(indent);
  const suffix = node.isDir ? '/' : '';
  const icon = getFileIcon(node.isDir ? '' : path.extname(node.name).toLowerCase(), node.isDir);
  const sizeStr = ` (${formatSize(node.size)})`;
  const nameBold = node.isDir ? `**${node.name}${suffix}**` : `\`${node.name}\``;
  const skippedNote = node.skipped ? ' *(contents skipped)*' : '';

  let md = `${spaces}- ${icon} ${nameBold}${sizeStr}${skippedNote}\n`;

  if (node.children) {
    for (const child of node.children) {
      md += compileMarkdown(child, indent + 1);
    }
  }

  return md;
}

export async function createMarkdownCatalog(
  rootPath: string,
  maxDepth = 5
): Promise<{markdown: string; totalSize: number; itemsCount: number}> {
  const abs = path.resolve(rootPath);
  const tree = await buildCatalogTree(abs, 0, maxDepth);

  let itemsCount = 0;
  const countNodes = (n: CatalogNode) => {
    itemsCount++;
    n.children?.forEach(countNodes);
  };
  countNodes(tree);

  const timestamp = new Date().toLocaleString();
  let markdown = `# sift Catalog: ${abs}\n\n`;
  markdown += `*Generated on ${timestamp} | Depth limit: ${maxDepth}*\n`;
  markdown += `*Total directory size: **${formatSize(tree.size)}** | Total logged entries: **${itemsCount}***\n\n`;
  
  // Skip the root folder line itself in list output, just list children
  if (tree.children) {
    for (const child of tree.children) {
      markdown += compileMarkdown(child, 0);
    }
  }

  return {markdown, totalSize: tree.size, itemsCount};
}