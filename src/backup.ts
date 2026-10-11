// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2026 DOS Browser Player contributors
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

export const MAX_SAVE_BYTES = 16 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 64 * 1024 * 1024;
export interface BackupMetadata {
  format: 'dos-player-save'; version: 1; gameId: string; createdAt: string;
  bundleVersion: string; runtime: string; sha256: string;
}

async function digest(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Validate the changes archive before it ever reaches the emulator. */
export function validateChanges(bytes: Uint8Array, allowEmpty = false): boolean {
  if (!bytes.length || bytes.length > MAX_SAVE_BYTES) throw new Error('Save data is empty or exceeds 16 MB.');
  let total = 0;
  let count = 0;
  let fileCount = 0;
  unzipSync(bytes, { filter(file) {
    if (++count > 4096 || (total += file.originalSize) > MAX_EXPANDED_BYTES) {
      throw new Error('The expanded save is too large.');
    }
    if (file.name.startsWith('/') || file.name.includes('\\') || file.name.includes(':') ||
        file.name.split('/').some(part => part === '..')) throw new Error('The save contains an unsafe file path.');
    if (!file.name.endsWith('/')) fileCount++;
    return true;
  } });
  if (!fileCount && !allowEmpty) throw new Error('No saved files yet. Save a game in Colonization first.');
  return fileCount > 0;
}

export async function encodeBackup(bytes: Uint8Array, info: Omit<BackupMetadata, 'format' | 'version' | 'sha256'>): Promise<Uint8Array> {
  validateChanges(bytes);
  const metadata: BackupMetadata = { ...info, format: 'dos-player-save', version: 1, sha256: await digest(bytes) };
  return zipSync({ 'manifest.json': strToU8(JSON.stringify(metadata)), 'changes.zip': bytes }, { level: 0 });
}

export async function decodeBackup(bytes: Uint8Array, gameId: string): Promise<{ metadata: BackupMetadata; changes: Uint8Array }> {
  if (bytes.length > MAX_SAVE_BYTES + 8192) throw new Error('The backup exceeds 16 MB.');
  let count = 0;
  const files = unzipSync(bytes, { filter(file) {
    if (++count > 2 || !['manifest.json', 'changes.zip'].includes(file.name)) throw new Error('This is not a player backup.');
    const limit = file.name === 'manifest.json' ? 4096 : MAX_SAVE_BYTES;
    if (file.originalSize > limit) throw new Error('The backup contents are too large.');
    return true;
  } });
  if (count !== 2 || !files['manifest.json'] || !files['changes.zip']) throw new Error('The backup is incomplete.');
  const metadata = JSON.parse(strFromU8(files['manifest.json'])) as BackupMetadata;
  if (metadata.format !== 'dos-player-save' || metadata.version !== 1) throw new Error('Unsupported backup format.');
  if (metadata.gameId !== gameId) throw new Error('This backup belongs to a different game.');
  if (typeof metadata.createdAt !== 'string' || !Number.isFinite(Date.parse(metadata.createdAt)) ||
      typeof metadata.bundleVersion !== 'string' || typeof metadata.runtime !== 'string') throw new Error('Invalid backup metadata.');
  if (metadata.sha256 !== await digest(files['changes.zip'])) throw new Error('The backup checksum does not match.');
  validateChanges(files['changes.zip']);
  return { metadata, changes: files['changes.zip'] };
}
