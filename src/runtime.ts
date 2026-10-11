// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2026 DOS Browser Player contributors
/** Public API subset verified against the vendored js-dos 8.5.3 runtime. */
export interface CommandInterface {
  pause(): void;
  resume(): void;
  exit(): Promise<void>;
  persist(onlyChanges?: boolean): Promise<Uint8Array | null>;
  events(): { onExit(callback: () => void): void };
}
export interface DosProps {
  getVersion(): [string, string];
  getLocalChanges(key: string): Promise<Uint8Array | null>;
  setNoCloud(value: boolean): void;
  setPaused(value: boolean): void;
  setVolume(value: number): void;
  stop(): Promise<void>;
}
export interface AudioOutput { setVolume(value: number): void }
export interface DosOptions {
  audioOutput: { volume: number; onReady(output: AudioOutput): void };
  url: string; pathPrefix: string; pathSuffix: string; backend: 'dosboxX'; backendLocked: boolean;
  workerThread: boolean; kiosk: boolean; autoStart: boolean; autoSave: boolean;
  renderBackend: 'canvas'; renderAspect: '4/3'; imageRendering: 'pixelated';
  volume: number; mouseCapture: boolean;
  onEvent(event: string, argument?: unknown): void;
  fsChanges: {
    local: boolean;
    urlToKey(url: string): Promise<string>;
    pull(key: string): Promise<Uint8Array | null>;
    push(key: string, bytes: Uint8Array): Promise<void>;
  };
}
export type DosFactory = (mount: HTMLDivElement, options: DosOptions) => DosProps;
declare global { interface Window { Dos: DosFactory } }

export interface GameProfile {
  id: string; title: string; bundle: string; version: string; saveKey: string;
  backend: 'dosboxX'; runtime: string; emulators: string;
}
