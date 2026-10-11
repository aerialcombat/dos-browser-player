// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2026 DOS Browser Player contributors
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { PlayerSession } from '../src/session.ts';
import { SaveStore } from '../src/save-store.ts';
import { encodeBackup, decodeBackup } from '../src/backup.ts';
import type { DosOptions, GameProfile, CommandInterface } from '../src/runtime.ts';

const profile: GameProfile = { id: 'colonization', title: 'Colonization', bundle: './colonization.jsdos',
  version: 'abc123', saveKey: './colonization.jsdos.changes', backend: 'dosboxX', runtime: '8.5.3', emulators: '8.5.2' };
const bytes = zipSync({ 'col/COLONY01.SAV': strToU8('progress') });
Object.defineProperty(globalThis, 'document', { value: { baseURI: 'http://127.0.0.1:8123/', createElement: () => ({ className: '' }) }, configurable: true });

function fixture(legacy: Uint8Array | null = null) {
  const store = new SaveStore(`session-${crypto.randomUUID()}`);
  let options!: DosOptions; let exits = 0; let persists = 0; let exitEvent = () => {};
  let persisted: Uint8Array | null = bytes;
  const ci: CommandInterface = { pause() {}, resume() {}, exit: async () => { exitEvent(); }, persist: async () => { persists++; return persisted; }, events: () => ({ onExit: cb => { exitEvent = cb; } }) };
  const session = new PlayerSession(profile, store, (_mount, opts) => {
    options = opts;
    return { getVersion: () => ['8.5.3', '8.5.2'], getLocalChanges: async () => legacy,
      setNoCloud() {}, setPaused() {}, setVolume() {}, stop: async () => { exits++; exitEvent(); } };
  }, { replaceChildren() {} } as unknown as HTMLDivElement);
  return { session, store, get options() { return options; }, run() { options.onEvent('ci-ready', ci); },
    setPersisted(value: Uint8Array | null) { persisted = value; }, get exits() { return exits; }, get persists() { return persists; } };
}

test('preserves legacy save key, migrates once, and repeats start/pause/save/stop', async () => {
  const f = fixture(bytes);
  try {
    await f.session.open();
    assert.equal(await f.options.fsChanges.urlToKey('anything'), profile.saveKey);
    assert.deepEqual(await f.options.fsChanges.pull(profile.saveKey), bytes);
    assert.equal((await f.store.get(profile.id))?.revision, 1);
    f.run(); f.session.pause(); assert.equal(f.session.state, 'paused');
    f.session.pause(); assert.equal(f.session.state, 'running');
    await f.session.save(); assert.equal((await f.store.get(profile.id))?.revision, 2);
    await f.session.stop(); assert.equal(f.exits, 1); assert.equal(f.session.state, 'stopped');
    await f.session.open(); assert.deepEqual(await f.options.fsChanges.pull(profile.saveKey), bytes);
    assert.equal((await f.store.get(profile.id))?.revision, 3);
    f.run(); await f.session.stop(); assert.equal(f.exits, 2);
  } finally { await f.session.stop(); await f.store.close(); }
});

test('failed save prevents stop and leaves live progress available for export', async () => {
  const f = fixture(); const put = f.store.put.bind(f.store);
  try {
    await f.session.open(); await f.options.fsChanges.pull(profile.saveKey); f.run();
    f.store.put = async () => { throw new Error('Storage quota exceeded'); };
    await assert.rejects(f.session.stop(), /quota/);
    assert.equal(f.session.state, 'running'); assert.equal(f.exits, 0);
    assert.deepEqual((await decodeBackup(await f.session.backup(), profile.id)).changes, bytes);
    assert.equal(await f.store.get(profile.id), undefined);
  } finally { f.store.put = put; await f.session.stop(); await f.store.close(); }
});

test('no changes does not claim a new write; restore is blocked while open and validates before replacing', async () => {
  const f = fixture();
  try {
    await f.session.open(); await f.options.fsChanges.pull(profile.saveKey); f.run();
    const backup = await encodeBackup(bytes, { gameId: profile.id, bundleVersion: 'old', runtime: '8.5.3', createdAt: new Date().toISOString() });
    await assert.rejects(f.session.restore(backup), /Stop the game/);
    f.setPersisted(null); await f.session.save(); assert.equal(await f.store.get(profile.id), undefined);
    await f.session.stop();
    await f.session.restore(backup); assert.deepEqual((await f.store.get(profile.id))?.bytes, bytes);
    const previous = await f.store.get(profile.id);
    await assert.rejects(f.session.restore(new Uint8Array([1, 2, 3])));
    assert.deepEqual(await f.store.get(profile.id), previous);
  } finally { await f.session.stop(); await f.store.close(); }
});

test('concurrent operations cannot race filesystem persistence', async () => {
  const f = fixture();
  try {
    await f.session.open(); await f.options.fsChanges.pull(profile.saveKey); f.run();
    const saving = f.session.save();
    await assert.rejects(f.session.save(), /Wait/); await saving;
    assert.equal(f.persists, 1);
  } finally { await f.session.stop(); await f.store.close(); }
});

test('volume reaches the live output and survives stop/reopen without controlling old output', async () => {
  const f = fixture(); const levels: number[] = [];
  try {
    f.session.volume(0.4); await f.session.open();
    assert.equal(f.options.audioOutput.volume, 0.4);
    f.options.audioOutput.onReady({ setVolume: value => levels.push(value) });
    f.run(); f.session.volume(0); f.session.volume(0.5);
    assert.deepEqual(levels, [0.4, 0, 0.5]);
    await f.session.stop(); f.session.volume(0.7);
    assert.deepEqual(levels, [0.4, 0, 0.5]);
    await f.session.open(); assert.equal(f.options.audioOutput.volume, 0.7);
  } finally { await f.session.stop(); await f.store.close(); }
});
