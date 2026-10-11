// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2026 DOS Browser Player contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('actual vendored AudioWorklet output routes through gain, supports silence, and disposes', async () => {
  const source = readFileSync('vendor/emulators/emulators.js', 'utf8');
  const start = source.indexOf('n.createAudioPort=async function(settings)');
  assert.ok(start >= 0, 'Build must patch the pinned audio factory');
  const end = source.indexOf(',n.audioWorkletCode=', start);
  const connections: unknown[] = []; const writes: number[] = []; const removed: string[] = [];
  let closed = false; let nodeDisconnected = false; let gainDisconnected = false;
  const destination = {};
  const gain = { gain: { value: 1, setValueAtTime(value: number) { writes.push(value); } },
    connect(target: unknown) { connections.push(target); }, disconnect() { gainDisconnected = true; } };
  let control!: { setVolume(value: number): void };
  const n: { createAudioPort?: Function; audioWorkletCode: string } = { audioWorkletCode: '' };
  runInNewContext(source.slice(start, end), { n, Blob,
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} }, console,
    document: { addEventListener() {}, removeEventListener(event: string) { removed.push(event); } },
    AudioContext: class { destination = destination; currentTime = 0; state = 'running';
      audioWorklet = { async addModule() {} }; createGain() { return gain; }
      async close() { closed = true; } },
    AudioWorkletNode: class { port = {}; connect(target: unknown) { connections.push(target); }
      disconnect() { nodeDisconnected = true; } },
  });
  const port = await n.createAudioPort!({ volume: 0.25, onReady(value: typeof control) { control = value; } });
  assert.deepEqual(connections, [gain, destination], 'No unattenuated connection to destination');
  assert.equal(gain.gain.value, 0.25);
  for (const value of [0, 0.5, 1, -1, 2]) control.setVolume(value);
  assert.deepEqual(writes, [0, 0.5, 1, 0, 1]);
  port.dispose();
  assert.ok(closed && nodeDisconnected && gainDisconnected);
  assert.deepEqual(removed, ['pointerdown', 'keydown']);
});
