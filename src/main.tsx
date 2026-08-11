import React from 'react';
import {render} from 'ink';
import {App} from './screens/app';

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
  sift                Interactive folder picker

Options:
  -v, --version       Show version
  -h, --help          Show help
  `);
  process.exit(0);
}

const initialFolder = args[0] || null;

render(<App initialFolder={initialFolder} />);
