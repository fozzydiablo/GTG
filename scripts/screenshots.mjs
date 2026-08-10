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

// Every exercise in the library, so a new entry is captured automatically.
// Pass id substrings to narrow it down: `node scripts/screenshots.mjs kb-`.
const { EXERCISES: LIBRARY } = await import('../src/data/exercises/index.js');
const filters = process.argv.slice(2);
// `poster` is the point in the rep worth photographing (top of a swing, bottom
// of a squat). The app freezes the animation there via ?phase=, so captures are
// deterministic instead of "whatever frame 1.5 seconds landed on".
const EXERCISES = LIBRARY
  .filter((ex) => !filters.length || filters.some((f) => ex.id.includes(f)))
  .map((ex) => ({ id: ex.id, phase: ex.poster ?? 0.5 }));

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

    for (const { id, phase } of EXERCISES) {
      const url = `http://localhost:${PORT}/?phase=${phase}#/today/${id}`;
      process.stdout.write(`  ${id} @ ${phase}... `);
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForSelector('.hero .stage canvas');
      // The rep is frozen at `phase`; this is just letting WebGL settle.
      await page.waitForTimeout(600);
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
