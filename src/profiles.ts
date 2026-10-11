// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2026 DOS Browser Player contributors
import type { GameProfile } from './runtime.ts';

/** The catalog is data, independent of the compiled player and stable save IDs. */
export function readProfiles(value: unknown): GameProfile[] {
  if (!Array.isArray(value) || !value.length) throw new Error('games.json must contain at least one game.');
  const ids = new Set<string>();
  return value.map(item => {
    if (!item || typeof item !== 'object') throw new Error('Invalid game profile.');
    const profile = item as GameProfile;
    for (const key of ['id', 'title', 'bundle', 'version', 'saveKey', 'runtime', 'emulators'] as const) {
      if (typeof profile[key] !== 'string' || !profile[key].trim()) throw new Error(`Missing profile ${key}.`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(profile.id) || ids.has(profile.id)) throw new Error('Game IDs must be unique lowercase names.');
    if (!/^\.\/[a-zA-Z0-9_-]+\.jsdos$/.test(profile.bundle)) throw new Error('Bundles must be root-level .jsdos files.');
    if (profile.backend !== 'dosboxX' || profile.runtime !== '8.5.3' || profile.emulators !== '8.5.2') throw new Error('Profile requires an unsupported runtime.');
    ids.add(profile.id);
    return profile;
  });
}
