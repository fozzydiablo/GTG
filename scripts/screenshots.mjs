// Capture a screenshot of each exercise's hero stage (the three.js canvas
// on the Today page) and save them as PNGs under docs/screenshots/.
//
// Usage: node scripts/screenshots.mjs
//
// Builds the app, starts `vite preview`, drives it with Playwright,
// captures one screenshot per exercise, then shuts everything down.

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// Resolve playwright from the global install if it isn't a local devDep.
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  const globalRoot = (await new Promise((resolve) => {
    const p = spawn('npm', ['root', '-g']);
    let out = '';
    p.stdout.on('data', (d) => out += d);
    p.on('exit', () => resolve(out.trim()));
  }));
  ({ chromium } = require(`${globalRoot}/playwright`));
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'screenshots');
const PORT = 4173;

const EXERCISES = [
  'bench-press', 'incline-bench', 'chest-fly', 'overhead-press', 'pushup',
  'dip', 'tricep-pushdown', 'overhead-triceps',
  'pullup', 'row', 'lat-pulldown', 'seated-row', 'face-pull',
  'bicep-curl', 'hammer-curl', 'lateral-raise',
  'squat', 'deadlift', 'rdl', 'split-squat', 'glute-bridge', 'calf-raise',
  'plank', 'crunch', 'russian-twist', 'hanging-leg-raise',
  'mountain-climber', 'dead-bug',
];

async function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', cwd: ROOT, ...opts });
    p.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} -> ${code}`)));
  });
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await sleep(200);
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  console.log('Building...');
  await run('npm', ['run', 'build']);

  console.log(`Starting preview on :${PORT}...`);
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', () => {}); // keep stdio drained
  server.stderr.on('data', () => {});

  try {
    await waitForServer(`http://localhost:${PORT}/`);
    console.log('Server ready.');

    const browser = await chromium.launch();
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();

    for (const id of EXERCISES) {
      const url = `http://localhost:${PORT}/#/today/${id}`;
      process.stdout.write(`  ${id}... `);
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForSelector('.hero .stage canvas');
      // Let the animation reach the top of the rep (≈ phase 0.5 of period).
      await page.waitForTimeout(1500);
      const canvas = await page.$('.hero .stage canvas');
      await canvas.screenshot({ path: path.join(OUT, `${id}.png`) });
      console.log('ok');
    }

    await browser.close();
  } finally {
    server.kill('SIGTERM');
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
