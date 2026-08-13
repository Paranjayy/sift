#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import {App} from './screens/app.js';

const args = process.argv.slice(2);

if (args.includes('--version') || args.includes('-v')) {
  console.log('sift v0.1.0');
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
sift — Sift through the mess.

Usage:
  sift [directory]    Organize a specific directory
  sift --global       Organize multiple folders at once
  sift                Interactive folder picker

Options:
  -g, --global        Batch organize configured folders
  -v, --version       Show version
  -h, --help          Show help
  `);
  process.exit(0);
}

const isGlobal = args.includes('--global') || args.includes('-g');
const initialFolder = isGlobal ? null : (args[0] || null);

render(<App initialFolder={initialFolder} isGlobal={isGlobal} />);
