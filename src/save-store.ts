// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2026 DOS Browser Player contributors
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface SaveRecord {
  gameId: string; bytes: Uint8Array; revision: number; savedAt: string; bundleVersion: string;
}
interface SaveDatabase extends DBSchema {
  saves: { key: string; value: SaveRecord };
  recovery: { key: string; value: SaveRecord };
}

export class SaveStore {
  private database: Promise<IDBPDatabase<SaveDatabase>>;
  constructor(name = 'dos-player-saves') {
    this.database = openDB<SaveDatabase>(name, 1, {
      upgrade(db) { db.createObjectStore('saves', { keyPath: 'gameId' }); db.createObjectStore('recovery', { keyPath: 'gameId' }); },
      blocking: () => { void this.database.then(db => db.close()); },
    });
  }
  async get(gameId: string): Promise<SaveRecord | undefined> { return (await this.database).get('saves', gameId); }
  async recovery(gameId: string): Promise<SaveRecord | undefined> { return (await this.database).get('recovery', gameId); }
  async put(gameId: string, bytes: Uint8Array, bundleVersion: string, expectedRevision: number, preserve = false): Promise<SaveRecord> {
    const db = await this.database;
    const tx = db.transaction(['saves', 'recovery'], 'readwrite');
    const current = await tx.objectStore('saves').get(gameId);
    if ((current?.revision ?? 0) !== expectedRevision) {
      tx.abort();
      await tx.done.catch(() => {});
      throw new Error('Another tab changed this save. Export your progress before reopening the game.');
    }
    const record: SaveRecord = { gameId, bytes: new Uint8Array(bytes), revision: expectedRevision + 1,
      savedAt: new Date().toISOString(), bundleVersion };
    if (preserve && current) await tx.objectStore('recovery').put(current);
    await tx.objectStore('saves').put(record);
    await tx.done;
    return record;
  }
  async close(): Promise<void> { (await this.database).close(); }
}
