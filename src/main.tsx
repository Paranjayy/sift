#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {App} from './screens/app.js';
import {undoOrganize} from './utils/organizer.js';
import {findGitRepos, inspectRepos, backupRepos, restoreFromBackup, listBackups, BACKUP_DIR} from './utils/git.js';

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

function scanRoot(): string {
  const explicit = flagValue('--root');
  if (explicit) return explicit;
  const dev = path.join(os.homedir(), 'Developer');
  return fs.existsSync(dev) ? dev : os.homedir();
}

if (args.includes('repos')) {
  const root = scanRoot();
  const repoPaths = await findGitRepos(root);
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
  const root = scanRoot();
  const mode = args.includes('--github') ? 'github' : args.includes('--local') ? 'local' : 'auto';
  const all = args.includes('--all');

  console.log(`Scanning for repos under ${root}...`);
  const repoPaths = await findGitRepos(root);
  const repos = await inspectRepos(repoPaths);

  if (repos.length === 0) {
    console.log(`No git repos found under ${root}`);
    process.exit(0);
  }

  const toBackup = all ? repos : repos.filter((r) => !r.hasRemote);
  if (toBackup.length === 0) {
    console.log('All repos already have remotes. Use --all to push everything.');
    process.exit(0);
  }

  console.log(`Backing up ${toBackup.length} repo${toBackup.length === 1 ? '' : 's'} (mode: ${mode})...\n`);
  const results = await backupRepos(toBackup, {mode, all});

  let ok = 0;
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
  sift backup [--all]     Back up repos missing a remote
                          (--github: force GitHub, --local: force bundles)
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

const isGlobal = args.includes('--global') || args.includes('-g');
const initialFolder = isGlobal ? null : (args[0] || null);

render(<App initialFolder={initialFolder} isGlobal={isGlobal} />);
