#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {App} from './screens/app.js';
import {BackupFlow} from './screens/backupFlow.js';
import {undoOrganize} from './utils/organizer.js';
import {findGitRepos, inspectRepos, backupRepos, restoreFromBackup, listBackups, BACKUP_DIR, type RepoInfo} from './utils/git.js';

const args = process.argv.slice(2);

if (args.includes('--version') || args.includes('-v')) {
  console.log('sift v0.1.0');
  process.exit(0);
}

function flagValue(name: string): string | null {
  const index = args.indexOf(name);
  if (index === -1 || index + 1 >= args.length) return null;
  return args[index + 1];
}

function scanOptions(): {root: string; depth: number} {
  const explicit = flagValue('--root');
  if (explicit) return {root: explicit, depth: 6};
  if (args.includes('--everywhere') || args.includes('--deep')) {
    return {root: os.homedir(), depth: 12};
  }
  const dev = path.join(os.homedir(), 'Developer');
  return {root: fs.existsSync(dev) ? dev : os.homedir(), depth: 6};
}

if (args.includes('repos')) {
  const {root, depth} = scanOptions();
  const repoPaths = await findGitRepos(root, depth);
  const repos = await inspectRepos(repoPaths);

  if (repos.length === 0) {
    console.log(`No git repos found under ${root}`);
    process.exit(0);
  }

  console.log(`Found ${repos.length} git repo${repos.length === 1 ? '' : 's'} under ${root}\n`);
  const padName = (s: string) => (s.length > 30 ? s.slice(0, 29) + '…' : s.padEnd(30));
  const padBranch = (s: string) => s.padEnd(8);

  console.log(
    `${'REPO'.padEnd(30)}  ${'BRANCH'.padEnd(8)}  ${'STATE'.padEnd(9)}  ${'REMOTE'}`
  );
  for (const repo of repos.sort((a, b) => a.name.localeCompare(b.name))) {
    const state = repo.dirty ? 'dirty' : (repo.ahead > 0 || repo.behind > 0 ? `±${repo.ahead}/${repo.behind}` : 'clean');
    console.log(
      `${padName(repo.name)}  ${padBranch(repo.branch)}  ${state.padEnd(9)}  ${repo.remote || '— NO REMOTE —'}`
    );
  }

  const unbacked = repos.filter((r) => !r.hasRemote);
  if (unbacked.length > 0) {
    console.log(`\n${unbacked.length} repo${unbacked.length === 1 ? '' : 's'} have no remote. Run \`sift backup\` to back them up.`);
  }
  process.exit(0);
}

if (args.includes('restore')) {
  const name = args[1];
  if (!name) {
    const backups = await listBackups();
    if (backups.length === 0) {
      console.log('No local backups found.');
    } else {
      console.log(`Usage: sift restore <name> [dest]\n\nLocal backups available:\n  ${backups.join('\n  ')}`);
    }
    process.exit(0);
  }

  const dest = args[2] || path.join(process.cwd(), name.endsWith('.git') ? name.slice(0, -4) : name);
  const result = await restoreFromBackup(name, dest);
  console.log(result.ok ? `✓ ${result.message}` : `✗ ${result.message}`);
  process.exit(0);
}

if (args.includes('backup')) {
  const mode: 'auto' | 'github' | 'local' = args.includes('--github') ? 'github' : args.includes('--local') ? 'local' : 'auto';
  const all = args.includes('--all');
  const nuke = args.includes('--nuke');
  const nukeIgnored = args.includes('--nuke-ignored') || args.includes('--prune');
  const named = args.find((a) => !a.startsWith('-') && a !== 'backup');

  const opts = {mode, all, nuke, nukeIgnored};

  const printResults = (results: {repo: {name: string}; status: string; detail: string}[]) => {
    let ok = 0;
    console.log('');
    for (const result of results) {
      const mark = result.status === 'failed' ? '✗' : '✓';
      if (result.status !== 'failed') ok++;
      console.log(` ${mark} ${result.repo.name} — ${result.status} — ${result.detail}`);
    }
    console.log(`\n${ok}/${results.length} backed up.`);
    if (mode !== 'local') {
      console.log(`Local bundles (fallback): ${BACKUP_DIR}`);
    }
    process.exit(0);
  };

  const runAndPrint = async (selected: RepoInfo[], action: 'backup' | 'nuke' | 'prune' = 'backup') => {
    const results = await backupRepos(selected, {...opts, nuke: action === 'nuke', nukeIgnored: action === 'prune'});
    printResults(results);
  };

  if (named) {
    const {root, depth} = scanOptions();
    console.log(`Scanning for repos under ${root}...`);
    const repos = await inspectRepos(await findGitRepos(root, depth));
    const match = repos.filter((r) => r.name === named);
    if (match.length === 0) {
      console.log(`No repo named "${named}" found under ${root}`);
      process.exit(0);
    }
    await runAndPrint(match);
    process.exit(0);
  }

  if (all) {
    const {root, depth} = scanOptions();
    console.log(`Scanning for repos under ${root}...`);
    const repos = await inspectRepos(await findGitRepos(root, depth));
    await runAndPrint(repos);
    process.exit(0);
  }

  const app = render(
    <BackupFlow
      runBackup={(selected, action) => backupRepos(selected, {...opts, nuke: action === 'nuke', nukeIgnored: action === 'prune'})}
      onDone={(results) => {
        app.unmount();
        printResults(results as {repo: {name: string}; status: string; detail: string}[]);
      }}
      onCancel={() => process.exit(0)}
    />
  );
}

if (args.includes('--undo') || args.includes('-u')) {
  const {restored, errors} = await undoOrganize();
  if (restored === 0 && errors.length === 0) {
    console.log('Nothing to undo.');
  } else {
    console.log(`Restored ${restored} file${restored === 1 ? '' : 's'}.`);
  }
  for (const error of errors) {
    console.error(`  ✗ ${error}`);
  }
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
sift — Sift through the mess.

Usage:
  sift [directory]        Organize a specific directory
  sift --global           Organize multiple folders at once
  sift repos [--root dir] List git repos and backup status
                          (--everywhere: deep-scan all of home)
  sift backup             Interactive — pick scan scope, then repos to back up
  sift backup <name>      Back up a single repo
  sift backup --all       Back up every repo (also push existing remotes)
                          Flags: --github (force GitHub) | --local (bundles)
                                 --nuke (snapshot + Trash the whole repo)
                                 --nuke-ignored/--prune (archive + Trash
                                 gitignored junk, keep source)
  sift restore <name>     Restore a repo from its local backup bundle
                          (optional dest, default: ./<name>)
  sift --undo             Restore the last organize
  sift                    Interactive folder picker

Options:
  -g, --global            Batch organize configured folders
  -u, --undo              Undo the last organize
  -v, --version           Show version
  -h, --help              Show help
  `);
  process.exit(0);
}

const isCommand = args.includes('repos') || args.includes('backup') || args.includes('restore') || args.includes('--undo') || args.includes('--help') || args.includes('--version');

if (!isCommand) {
  const isGlobal = args.includes('--global') || args.includes('-g');
  const initialFolder = isGlobal ? null : (args[0] || null);

  render(<App initialFolder={initialFolder} isGlobal={isGlobal} />);
}
