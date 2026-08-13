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
    await execFileAsync('gh', ['repo', 'create', repo.name, '--private', '--source', repo.path, '--remote', 'origin', '--push'], {timeout: 120000});
    const branch = repo.branch === 'detached' ? 'HEAD' : repo.branch;
    await execFileAsync('git', ['push', '-u', 'origin', branch], {cwd: repo.path, timeout: 120000});
    return {repo, status: 'created', detail: remoteUrl};
  } catch (err) {
    return backupLocal(repo, `gh failed: ${(err as Error).message.slice(0, 80)}`);
  }
}

async function backupLocal(repo: RepoInfo, reason = ''): Promise<BackupResult> {
  await fs.promises.mkdir(BACKUP_DIR, {recursive: true});
  const bundleDir = path.join(BACKUP_DIR, `${repo.name}.git`);
  try {
    if (!fs.existsSync(bundleDir)) {
      await execFileAsync('git', ['clone', '--bare', repo.path, bundleDir], {timeout: 180000});
    } else {
      await execFileAsync('git', ['--git-dir', bundleDir, 'remote', 'update', '--prune'], {timeout: 180000});
    }
    return {repo, status: 'bundled', detail: bundleDir + (reason ? ` (${reason})` : '')};
  } catch (err) {
    return {repo, status: 'failed', detail: (err as Error).message.slice(0, 120)};
  }
}

export async function backupRepos(
  repos: RepoInfo[],
  options: {mode: 'auto' | 'github' | 'local'; all: boolean}
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

    if (ghAvailable) {
      results.push(await backupWithGh(repo));
    } else {
      results.push(await backupLocal(repo));
    }
  }

  return results;
}