// Run: node server.js — open http://localhost:3000
import { spawn } from 'node:child_process';

const child = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  globalThis.process.exit(code ?? 0);
});
