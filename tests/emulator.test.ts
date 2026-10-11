// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2026 DOS Browser Player contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { unzipSync } from 'fflate';
import { encodeBackup, decodeBackup } from '../src/backup.ts';

test('real DOSBox-X persists a saved-game file and restores it into a fresh emulator', { timeout: 30_000 }, async () => {
  // The upstream Node loader expects CommonJS, while our application uses ESM.
  const directory = resolve('.derived/core-test'); mkdirSync(directory, { recursive: true });
  writeFileSync(`${directory}/package.json`, '{"type":"commonjs"}');
  for (const file of ['emulators.js', 'wdosbox-x.js', 'wdosbox-x.wasm', 'wlibzip.js', 'wlibzip.wasm']) {
    copyFileSync(`vendor/emulators/${file}`, `${directory}/${file}`);
  }
  createRequire(import.meta.url)(`${directory}/emulators.js`);
  const emulators = (globalThis as unknown as { emulators: {
    pathPrefix: string;
    dosboxXNode(bundle: Uint8Array | Uint8Array[]): Promise<{
      fsWriteFile(path: string, bytes: Uint8Array): Promise<void>;
      fsReadFile(path: string): Promise<Uint8Array>;
      persist(changes: boolean): Promise<Uint8Array | null>;
      exit(): Promise<void>;
    }>;
  } }).emulators;
  emulators.pathPrefix = `${directory}/`;
  const bundle = new Uint8Array(readFileSync('demo.jsdos'));
  const savedGame = new TextEncoder().encode('7');
  const first = await emulators.dosboxXNode(bundle);
  let backup: Uint8Array;
  try {
    await first.fsWriteFile('DEMO.SAV', savedGame);
    const changes = await first.persist(true); assert.ok(changes);
    backup = await encodeBackup(changes, { gameId: 'demo', bundleVersion: 'demo-test', runtime: '8.5.3', createdAt: new Date().toISOString() });
    writeFileSync('.derived/core-roundtrip.dos-save', backup);
  } finally { await first.exit(); }
  const restored = await decodeBackup(backup!, 'demo');
  const second = await emulators.dosboxXNode([bundle, restored.changes]);
  try { assert.deepEqual(await second.fsReadFile('DEMO.SAV'), savedGame); }
  finally { await second.exit(); }
});


