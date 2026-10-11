// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2026 DOS Browser Player contributors
import type { AudioOutput, CommandInterface, DosFactory, DosProps, GameProfile } from './runtime.ts';
import { SaveStore, type SaveRecord } from './save-store.ts';
import { decodeBackup, encodeBackup, validateChanges } from './backup.ts';

export type SessionState = 'stopped' | 'loading' | 'ready' | 'running' | 'paused' | 'error';
export interface SessionSnapshot { state: SessionState; busy: boolean; message: string; savedAt?: string; error?: string }

export class PlayerSession {
  private props?: DosProps;
  private ci?: CommandInterface;
  private audio?: AudioOutput;
  private record?: SaveRecord;
  private generation = 0;
  private timer?: ReturnType<typeof setInterval>;
  private operation?: Promise<unknown>;
  private level = 1;
  private snapshot: SessionSnapshot = { state: 'stopped', busy: false, message: 'Open the game to begin.' };
  private listeners = new Set<(snapshot: SessionSnapshot) => void>();
  private profile: GameProfile;
  private store: SaveStore;
  private factory: DosFactory;
  private mount: HTMLDivElement;
  constructor(profile: GameProfile, store: SaveStore, factory: DosFactory, mount: HTMLDivElement) {
    this.profile = profile; this.store = store; this.factory = factory; this.mount = mount;
  }
  subscribe(listener: (snapshot: SessionSnapshot) => void): () => void {
    this.listeners.add(listener); listener(this.snapshot); return () => this.listeners.delete(listener);
  }
  private update(change: Partial<SessionSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...change }; this.listeners.forEach(listener => listener(this.snapshot));
  }
  get state(): SessionState { return this.snapshot.state; }
  get busy(): boolean { return this.snapshot.busy; }
  private async exclusive<T>(task: () => Promise<T>): Promise<T> {
    if (this.operation) throw new Error('Wait for the current save operation to finish.');
    this.update({ busy: true, error: undefined });
    const operation = Promise.resolve().then(task); this.operation = operation;
    try { return await operation; }
    catch (error) { this.update({ error: error instanceof Error ? error.message : String(error) }); throw error; }
    finally { this.operation = undefined; this.update({ busy: false }); }
  }
  async open(): Promise<void> {
    if (this.props) throw new Error('Stop the current session before opening another.');
    await this.exclusive(async () => {
      this.record = await this.store.get(this.profile.id);
      this.update({ state: 'loading', message: 'Loading the game…', savedAt: this.record?.savedAt });
      const generation = ++this.generation;
      const target = document.createElement('div'); target.className = 'dos-mount'; this.mount.replaceChildren(target);
      let resolveProps!: (props: DosProps) => void;
      const availableProps = new Promise<DosProps>(resolve => { resolveProps = resolve; });
      this.props = this.factory(target, {
        url: `${this.profile.bundle}?v=${this.profile.version}`, pathPrefix: new URL('./vendor/emulators/', document.baseURI).href, pathSuffix: '?v=8.5.2-volume1',
        backend: this.profile.backend, backendLocked: true, workerThread: true,
        audioOutput: { volume: this.level, onReady: output => {
          if (generation === this.generation) { this.audio = output; output.setVolume(this.level); }
        } },
        kiosk: true, autoStart: false, autoSave: false, mouseCapture: false,
        imageRendering: 'pixelated', renderBackend: 'canvas', renderAspect: '4/3', volume: this.level,
        fsChanges: {
          local: false, urlToKey: async () => this.profile.saveKey,
          pull: async () => {
            if (this.record) return this.record.bytes;
            // One-time migration of deployed OPFS data, through the public API.
            // Once a record exists, only our transactional store is used.
            const old = await (await availableProps).getLocalChanges(this.profile.saveKey);
            if (old && validateChanges(old, true)) {
              this.record = await this.store.put(this.profile.id, old, this.profile.version, 0);
              this.update({ savedAt: this.record.savedAt, message: 'Existing browser save preserved.' });
            }
            return old;
          },
          push: async (_key, bytes) => { await this.write(bytes); },
        },
        onEvent: (event, argument) => {
          if (generation !== this.generation) return;
          if (event === 'ci-ready') {
            this.ci = argument as CommandInterface;
            this.update({ state: 'running', message: 'Game running. Save in-game before saving to the browser.' });
            this.ci.events().onExit(() => {
              if (generation === this.generation) { this.clearTimer(); this.ci = undefined; this.props = undefined; this.audio = undefined;
                this.mount.replaceChildren();
                this.update({ state: 'stopped', message: 'Game closed. Open it again to continue.' }); }
            });
            this.timer = setInterval(() => { if (this.ci && !this.operation) void this.save().catch(() => {}); }, 60_000);
          }
        },
      });
      resolveProps(this.props); this.props.setNoCloud(true);
    });
  }
  ready(): void { if (this.state === 'loading') this.update({ state: 'ready', message: 'Press Play in the game window to enable sound.' }); }
  failure(message: string): void { this.update({ state: 'error', error: message }); this.clearTimer(); }
  private clearTimer(): void { if (this.timer) clearInterval(this.timer); this.timer = undefined; }
  private async write(bytes: Uint8Array): Promise<void> {
    if (!validateChanges(bytes, true)) { this.update({ message: 'No new file changes to save.' }); return; }
    this.record = await this.store.put(this.profile.id, bytes, this.profile.version, this.record?.revision ?? 0);
    this.update({ savedAt: this.record.savedAt, message: 'Saved to this browser.' });
  }
  private async persist(): Promise<Uint8Array | null> {
    if (!this.ci) throw new Error('Start the game before saving.');
    this.update({ message: 'Saving game files…' });
    const bytes = await this.ci.persist(true);
    if (bytes) await this.write(bytes);
    else this.update({ message: 'No new file changes to save.' });
    return bytes;
  }
  async save(): Promise<void> { await this.exclusive(async () => { await this.persist(); }); }
  pause(): void {
    if (!this.ci || this.operation) return;
    const pause = this.state !== 'paused'; this.props?.setPaused(pause);
    this.update({ state: pause ? 'paused' : 'running', message: pause ? 'Game paused.' : 'Game running.' });
  }
  volume(value: number): void { this.level = Math.min(1, Math.max(0, value)); this.audio?.setVolume(this.level); }
  async stop(): Promise<void> {
    await this.exclusive(async () => {
      if (this.ci) await this.persist(); // A failed save leaves the running session intact.
      this.clearTimer(); ++this.generation;
      this.update({ message: 'Closing the emulator…' });
      // Keep the player's transport mounted until the core acknowledges exit.
      await this.ci?.exit();
      await this.props?.stop(); this.props = undefined; this.ci = undefined; this.audio = undefined; this.mount.replaceChildren();
      this.update({ state: 'stopped', message: 'Session stopped. Your saved files will load next time.' });
    });
  }
  async backup(): Promise<Uint8Array> {
    return this.exclusive(async () => {
      // Export remains possible if local storage fails or a competing tab saved.
      const persisted = this.ci ? await this.ci.persist(true) : null;
      const live = persisted && validateChanges(persisted, true) ? persisted : null;
      const record = this.ci ? this.record : await this.store.get(this.profile.id);
      const bytes = live ?? (record?.bytes && validateChanges(record.bytes, true) ? record.bytes : null);
      if (!bytes) throw new Error('No saved files yet. Save a game inside the running game first.');
      const result = await encodeBackup(bytes, { gameId: this.profile.id, createdAt: new Date().toISOString(),
        bundleVersion: this.profile.version, runtime: this.profile.runtime });
      this.update({ message: 'Backup prepared for download.' }); return result;
    });
  }
  async restore(bytes: Uint8Array): Promise<void> {
    if (this.props || this.state !== 'stopped') throw new Error('Stop the game before restoring a backup.');
    await this.exclusive(async () => {
      const backup = await decodeBackup(bytes, this.profile.id);
      const current = await this.store.get(this.profile.id);
      this.record = await this.store.put(this.profile.id, backup.changes, backup.metadata.bundleVersion, current?.revision ?? 0, true);
      this.update({ savedAt: this.record.savedAt, message: 'Backup restored. Open the game, then load its saved game.' });
    });
  }
  async undoRestore(): Promise<void> {
    if (this.props || this.state !== 'stopped') throw new Error('Stop the game before recovering saved files.');
    await this.exclusive(async () => {
      const recovery = await this.store.recovery(this.profile.id);
      if (!recovery) throw new Error('No earlier save is available.');
      const current = await this.store.get(this.profile.id);
      this.record = await this.store.put(this.profile.id, recovery.bytes, recovery.bundleVersion, current?.revision ?? 0, true);
      this.update({ savedAt: this.record.savedAt, message: 'Previous saved files recovered.' });
    });
  }
}
