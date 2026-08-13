import {execFile} from 'child_process';
import {promisify} from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execFileAsync = promisify(execFile);

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.cache',
  '.Trash',
  'Library',
  'Applications',
  'AppData',
  'venv',
  '.venv',
  'target',
  'build',
  'dist',
  '.next',
  '.vscode',
  'Pictures',
  'Music',
  'Movies',
  '.config',
  '.local',
]);

const DEFAULT_SCAN_ROOT = path.join(os.homedir(), 'Developer');
export const BACKUP_DIR = path.join(os.homedir(), '.config', 'sift', 'backups');

export interface RepoInfo {
  name: string;
  path: string;
  branch: string;
  dirty: boolean;
  ahead: number;
  behind: number;
  remote: string | null;
  remoteIsGitHub: boolean;
  lastCommit: string | null;
  hasRemote: boolean;
}

export interface BackupResult {
  repo: RepoInfo;
  status: 'pushed' | 'created' | 'bundled' | 'skipped' | 'failed';
  detail: string;
}

async function runGit(cwd: string, args: string[]): Promise<string> {
  try {
    const {stdout} = await execFileAsync('git', args, {
      cwd,
      timeout: 20000,
      maxBuffer: 10 * 1024 * 1024,
      env: {...process.env, GIT_OPTIONAL_LOCKS: '0'},
    });
    return stdout.trim();
  } catch {
    return '';
  }
}

export async function findGitRepos(root: string, maxDepth = 6): Promise<string[]> {
  const repos: string[] = [];
  const rootStat = await fs.promises.stat(root).catch(() => null);
  if (!rootStat?.isDirectory()) return repos;

  const walk = async (dir: string, depth: number) => {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await fs.promises.readdir(dir, {withFileTypes: true});
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name === '.git') {
        repos.push(dir);
        continue;
      }
      if (!entry.isDirectory() || entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (full.startsWith('/System') || full.startsWith('/Library') || full.startsWith('/usr')) continue;
      await walk(full, depth + 1);
    }
  };

  await walk(root, 0);
  return repos;
}

export async function inspectRepo(repoPath: string): Promise<RepoInfo> {
  const name = path.basename(repoPath);
  const branch = await runGit(repoPath, ['branch', '--show-current']);
  const status = await runGit(repoPath, ['status', '-sb']);
  const dirty = status.split('\n').some((line) => line.trim().startsWith('M') || line.trim().startsWith('A') || line.trim().startsWith('D') || line.trim().startsWith('R') || line.trim().startsWith('??'));
  const aheadBehind = status.match(/\[ahead (\d+)(?:, behind (\d+))?\]/);
  const ahead = aheadBehind ? parseInt(aheadBehind[1] || '0', 10) : 0;
  const behind = aheadBehind && aheadBehind[2] ? parseInt(aheadBehind[2], 10) : 0;
  const remoteUrl = await runGit(repoPath, ['remote', 'get-url', 'origin']);
  const lastCommit = await runGit(repoPath, ['log', '-1', '--format=%cI']);

  return {
    name,
    path: repoPath,
    branch: branch || 'detached',
    dirty,
    ahead,
    behind,
    remote: remoteUrl || null,
    remoteIsGitHub: remoteUrl ? /github\.com|git@github\.com/.test(remoteUrl) : false,
    lastCommit: lastCommit || null,
    hasRemote: Boolean(remoteUrl),
  };
}

export async function inspectRepos(repoPaths: string[], concurrency = 8): Promise<RepoInfo[]> {
  const repos: RepoInfo[] = new Array(repoPaths.length);
  let next = 0;

  const worker = async () => {
    while (true) {
      const index = next++;
      if (index >= repoPaths.length) return;
      repos[index] = await inspectRepo(repoPaths[index]);
    }
  };

  await Promise.all(Array.from({length: Math.min(concurrency, repoPaths.length)}, worker));
  return repos;
}

export async function isGhAuthenticated(): Promise<boolean> {
  try {
    await execFileAsync('gh', ['auth', 'status'], {timeout: 10000});
    return true;
  } catch {
    return false;
  }
}

async function backupWithGh(repo: RepoInfo): Promise<BackupResult> {
  const remoteUrl = `https://github.com/${repo.name}.git`;
  try {
    const backupBranch = await captureWorkingState(repo);
    await execFileAsync('gh', ['repo', 'create', repo.name, '--private', '--source', repo.path, '--remote', 'origin'], {timeout: 120000});
    await pushAll(repo.path, backupBranch);
    const detail = remoteUrl + (backupBranch ? ` (staged/untracked saved to ${backupBranch})` : '');
    return {repo, status: 'created', detail};
  } catch (err) {
    return backupLocal(repo, `gh failed: ${(err as Error).message.slice(0, 80)}`);
  }
}

async function backupLocal(repo: RepoInfo, reason = ''): Promise<BackupResult> {
  await fs.promises.mkdir(BACKUP_DIR, {recursive: true});
  const bundleDir = path.join(BACKUP_DIR, `${repo.name}.git`);
  try {
    const backupBranch = await captureWorkingState(repo);
    if (!fs.existsSync(bundleDir)) {
      await execFileAsync('git', ['clone', '--mirror', repo.path, bundleDir], {timeout: 180000});
    } else {
      await execFileAsync('git', ['--git-dir', bundleDir, 'remote', 'update', '--prune'], {timeout: 180000});
    }
    if (backupBranch) {
      await runGit(repo.path, ['branch', '-D', backupBranch]);
    }
    return {repo, status: 'bundled', detail: bundleDir + (reason ? ` (${reason})` : '')};
  } catch (err) {
    return {repo, status: 'failed', detail: (err as Error).message.slice(0, 120)};
  }
}

async function captureWorkingState(repo: RepoInfo): Promise<string | null> {
  const hasCommits = await runGit(repo.path, ['rev-parse', '--verify', 'HEAD']);
  const status = await runGit(repo.path, ['status', '--porcelain']);
  if (!status.trim() && hasCommits) return null;

  const ts = timestamp();
  const branchName = `backup/auto-${ts}`;

  if (!hasCommits) {
    try {
      await execFileAsync('git', ['add', '-A'], {cwd: repo.path});
      await execFileAsync('git', ['commit', '-m', `sift auto-backup ${ts}`], {cwd: repo.path});
      return branchName;
    } catch {
      return null;
    }
  }

  let sha = await runGit(repo.path, ['stash', 'create', '-u']);
  if (!sha) {
    sha = await runGit(repo.path, ['stash', 'create']);
  }
  if (!sha) return null;

  try {
    await execFileAsync('git', ['branch', branchName, sha], {cwd: repo.path});
    return branchName;
  } catch {
    return null;
  }
}

async function pushAll(repoPath: string, backupBranch: string | null): Promise<void> {
  const current = await runGit(repoPath, ['branch', '--show-current']) || 'HEAD';
  
  const push = async (args: string[]) => {
    try {
      await execFileAsync('git', ['push', ...args], {cwd: repoPath, timeout: 90000});
    } catch {
      await execFileAsync('git', ['push', '--force-with-lease', ...args], {cwd: repoPath, timeout: 90000});
    }
  };

  if (current !== 'HEAD') {
    await push(['-u', 'origin', current]);
  }
  await push(['origin', '--all']);
  await push(['origin', '--tags']);

  if (backupBranch) {
    await runGit(repoPath, ['branch', '-D', backupBranch]);
  }
}

export async function restoreFromBackup(name: string, dest: string): Promise<{ok: boolean; message: string}> {
  const clean = name.endsWith('.git') ? name.slice(0, -4) : name;
  const bundle = path.join(BACKUP_DIR, `${clean}.git`);

  if (!fs.existsSync(bundle)) {
    return {ok: false, message: `No local backup for "${clean}" at ${bundle}. Run \`sift backup\` first.`};
  }

  if (fs.existsSync(dest)) {
    return {ok: false, message: `Destination already exists: ${dest}`};
  }

  try {
    await execFileAsync('git', ['clone', bundle, dest], {timeout: 180000});
    return {ok: true, message: `Restored ${clean} → ${dest}`};
  } catch (err) {
    return {ok: false, message: (err as Error).message.slice(0, 160)};
  }
}

export async function listBackups(): Promise<string[]> {
  try {
    const entries = await fs.promises.readdir(BACKUP_DIR, {withFileTypes: true});
    return entries
      .filter((e) => e.isDirectory() && e.name.endsWith('.git'))
      .map((e) => e.name.slice(0, -4))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

const TRASH_DIR = path.join(os.homedir(), '.Trash');

export async function trashPath(absPath: string): Promise<string> {
  await fs.promises.mkdir(TRASH_DIR, {recursive: true});
  const base = path.basename(absPath);
  let dest = path.join(TRASH_DIR, base);
  let n = 1;
  while (fs.existsSync(dest)) {
    dest = path.join(TRASH_DIR, `${base}-${n++}`);
  }
  await fs.promises.rename(absPath, dest);
  return dest;
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function quoteShell(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

export async function snapshotRepo(repoPath: string): Promise<string> {
  await fs.promises.mkdir(BACKUP_DIR, {recursive: true});
  const name = path.basename(repoPath);
  const out = path.join(BACKUP_DIR, `${name}-full-${timestamp()}.tar.gz`);
  await execFileAsync('tar', ['-czf', out, '-C', path.dirname(repoPath), name], {timeout: 600000});
  return out;
}

export async function archiveUntracked(repo: RepoInfo): Promise<string> {
  await fs.promises.mkdir(BACKUP_DIR, {recursive: true});
  const out = path.join(BACKUP_DIR, `${repo.name}-untracked-${timestamp()}.tar.gz`);
  const script = `git -C ${quoteShell(repo.path)} ls-files -o -z | tar --null -T - -czf ${quoteShell(out)} -C ${quoteShell(repo.path)}`;
  await execFileAsync('bash', ['-c', script], {timeout: 600000});
  return out;
}

async function topLevelIgnored(repo: RepoInfo): Promise<string[]> {
  const raw = await runGit(repo.path, ['status', '--porcelain', '--ignored']);
  const top: string[] = [];
  for (const line of raw.split('\n')) {
    const match = line.match(/^!! (.+)$/);
    if (!match) continue;
    top.push(match[1].replace(/\/$/, ''));
  }
  return top;
}

export async function pruneIgnored(repo: RepoInfo): Promise<string[]> {
  const top = await topLevelIgnored(repo);
  const trashed: string[] = [];
  for (const rel of top) {
    try {
      const full = path.join(repo.path, rel);
      if (!fs.existsSync(full)) continue;
      const dest = await trashPath(full);
      trashed.push(`${rel} → ${dest}`);
    } catch (err) {
      trashed.push(`${rel} → failed: ${(err as Error).message.slice(0, 60)}`);
    }
  }
  return trashed;
}

export async function backupRepos(
  repos: RepoInfo[],
  options: {mode: 'auto' | 'github' | 'local'; all: boolean; nuke?: boolean; nukeIgnored?: boolean}
): Promise<BackupResult[]> {
  const ghAvailable = options.mode !== 'local' && await isGhAuthenticated();
  const results: BackupResult[] = [];

  for (const repo of repos) {
    if (repo.hasRemote) {
      if (!options.all) {
        results.push({repo, status: 'skipped', detail: repo.remote || 'has remote'});
        continue;
      }
      try {
        await execFileAsync('git', ['push'], {cwd: repo.path, timeout: 120000});
        results.push({repo, status: 'pushed', detail: repo.remote || 'pushed'});
      } catch (err) {
        results.push({repo, status: 'failed', detail: (err as Error).message.slice(0, 120)});
      }
      continue;
    }

    let result: BackupResult;
    if (ghAvailable) {
      result = await backupWithGh(repo);
    } else {
      result = await backupLocal(repo);
    }

    if (result.status === 'failed') {
      results.push(result);
      continue;
    }

    if (options.nuke) {
      try {
        const snap = await snapshotRepo(repo.path);
        const trash = await trashPath(repo.path);
        results.push({...result, detail: `${result.detail} | snapshot: ${snap} | nuked → ${trash}`});
        continue;
      } catch (err) {
        results.push({...result, status: 'failed', detail: `backup ok, nuke failed: ${(err as Error).message.slice(0, 100)}`});
        continue;
      }
    }

    if (options.nukeIgnored) {
      try {
        const archived = await archiveUntracked(repo);
        const trashed = await pruneIgnored(repo);
        results.push({...result, detail: `${result.detail} | archived: ${archived} | pruned: ${trashed.join(', ')}`});
        continue;
      } catch (err) {
        results.push({...result, status: 'failed', detail: `backup ok, prune failed: ${(err as Error).message.slice(0, 100)}`});
        continue;
      }
    }

    results.push(result);
  }

  return results;
}