// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2026 DOS Browser Player contributors
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8, unzipSync } from 'fflate';
import { decodeBackup, encodeBackup, validateChanges } from '../src/backup.ts';
import { SaveStore } from '../src/save-store.ts';

const changes = (text = 'progress') => zipSync({ 'col/COLONY01.SAV': strToU8(text) });
const info = { gameId: 'colonization', bundleVersion: 'first', runtime: '8.5.3', createdAt: '2026-10-11T12:00:00Z' };

test('portable backup round-trips saved files and rejects corruption or another game', async () => {
  const bytes = changes(); const backup = await encodeBackup(bytes, info);
  assert.deepEqual((await decodeBackup(backup, 'colonization')).changes, bytes);
  await assert.rejects(decodeBackup(backup, 'other-game'), /different game/);
  const contents = unzipSync(backup); contents['changes.zip'][20] ^= 1;
  await assert.rejects(decodeBackup(zipSync(contents), 'colonization'), /checksum/);
  await assert.rejects(decodeBackup(new Uint8Array([1, 2, 3]), 'colonization'));
});

test('rejects traversal, oversized expanded entries, incomplete and unsupported backups', async () => {
  assert.equal(validateChanges(zipSync({ 'col/': new Uint8Array() }), true), false);
  assert.throws(() => validateChanges(zipSync({ 'col/': new Uint8Array() })), /No saved files/);
  assert.throws(() => validateChanges(zipSync({ '../COLONY01.SAV': strToU8('x') })), /unsafe/);
  const huge = changes();
  for (let i = 0; i < huge.length - 24; i++) {
    if (huge[i] === 80 && huge[i + 1] === 75 && huge[i + 2] === 1 && huge[i + 3] === 2) {
      new DataView(huge.buffer).setUint32(i + 24, 100 * 1024 * 1024, true); break;
    }
  }
  assert.throws(() => validateChanges(huge), /too large/);
  await assert.rejects(decodeBackup(zipSync({ 'changes.zip': changes() }), 'colonization'), /incomplete/);
  const backup = unzipSync(await encodeBackup(changes(), info));
  backup['manifest.json'] = strToU8(JSON.stringify({ ...info, format: 'dos-player-save', version: 2 }));
  await assert.rejects(decodeBackup(zipSync(backup), 'colonization'), /Unsupported/);
});

test('save records survive reopening and bundle updates; stale writes preserve the latest save', async () => {
  const name = `test-${crypto.randomUUID()}`; let store = new SaveStore(name);
  await store.put('colonization', changes('first'), 'first-bundle', 0);
  await store.close(); store = new SaveStore(name);
  try {
    assert.equal((await store.get('colonization'))?.revision, 1);
    await store.put('colonization', changes('second'), 'new-bundle', 1);
    await assert.rejects(store.put('colonization', changes('stale'), 'first-bundle', 1), /Another tab/);
    const record = (await store.get('colonization'))!;
    assert.equal(record.revision, 2); assert.equal(record.bundleVersion, 'new-bundle');
    assert.equal(new TextDecoder().decode(unzipSync(record.bytes)['col/COLONY01.SAV']), 'second');
  } finally { await store.close(); }
});

test('restore keeps previous saved files atomically for recovery and separates games', async () => {
  const store = new SaveStore(`test-${crypto.randomUUID()}`);
  try {
    await store.put('colonization', changes('before'), 'old', 0);
    await store.put('other', changes('other-game'), 'old', 0);
    await store.put('colonization', changes('after'), 'new', 1, true);
    assert.deepEqual((await store.recovery('colonization'))?.bytes, changes('before'));
    assert.deepEqual((await store.get('other'))?.bytes, changes('other-game'));
    await assert.rejects(store.put('colonization', changes('failed'), 'new', 1, true));
    assert.deepEqual((await store.recovery('colonization'))?.bytes, changes('before'));
  } finally { await store.close(); }
});
