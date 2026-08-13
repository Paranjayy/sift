#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import {App} from './screens/app.js';
import {undoOrganize} from './utils/organizer.js';

const args = process.argv.slice(2);

if (args.includes('--version') || args.includes('-v')) {
  console.log('sift v0.1.0');
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
  sift [directory]    Organize a specific directory
  sift --global       Organize multiple folders at once
  sift --undo         Restore the last organize
  sift                Interactive folder picker

Options:
  -g, --global        Batch organize configured folders
  -u, --undo          Undo the last organize
  -v, --version       Show version
  -h, --help          Show help
  `);
  process.exit(0);
}

const isGlobal = args.includes('--global') || args.includes('-g');
const initialFolder = isGlobal ? null : (args[0] || null);

render(<App initialFolder={initialFolder} isGlobal={isGlobal} />);
