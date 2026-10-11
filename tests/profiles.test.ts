// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2026 DOS Browser Player contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readProfiles } from '../src/profiles.ts';
const demo = JSON.parse(readFileSync('profiles/demo.json', 'utf8'));
test('catalog enforces distinct stable save identities and the supported runtime', () => {
  assert.equal(readProfiles([demo])[0].id, 'demo');
  for (const invalid of [[], [demo, demo], [{...demo, id: '../other'}], [{...demo, bundle: 'https://other/game.jsdos'}], [{...demo, backend: 'dosbox'}], [{...demo, version: ''}]]) {
    assert.throws(() => readProfiles(invalid));
  }
});
