#!/usr/bin/env node
/**
 * `npm run demo`: the dashboard on invented data, no key needed. Starts the
 * fake API (demo-api.mjs) and `next dev` pointed at it.
 */
import { spawn } from 'node:child_process';

const API_PORT = process.env.DEMO_PORT ?? process.env.DEMO_API_PORT ?? '4010';
const api = spawn(process.execPath, ['scripts/demo-api.mjs', API_PORT], { stdio: 'inherit' });
const next = spawn('npx', ['next', 'dev'], {
  stdio: 'inherit',
  env: { ...process.env, MENTIO_API_KEY: 'mk_live_demo', MENTIO_API_URL: `http://localhost:${API_PORT}`, APIFY_TOKEN: 'apify_api_demo', APIFY_API_URL: `http://localhost:${API_PORT}/apify` },
});
const stop = () => {
  api.kill();
  next.kill();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
next.on('exit', (code) => {
  api.kill();
  process.exit(code ?? 0);
});
