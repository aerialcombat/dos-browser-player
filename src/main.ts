// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2026 DOS Browser Player contributors
import { readProfiles } from './profiles.ts';
import type { GameProfile } from './runtime.ts';
import { PlayerSession } from './session.ts';
import { SaveStore } from './save-store.ts';
import { MAX_SAVE_BYTES } from './backup.ts';
import './player.css';

const profiles = readProfiles(await fetch('./games.json').then(response => {
  if (!response.ok) throw new Error('Could not load games.json. Check the player setup.');
  return response.json();
}));
const requested = new URLSearchParams(location.search).get('game') ?? profiles[0].id;
const selectedProfile = profiles.find(game => game.id === requested);
if (!selectedProfile) {
  document.querySelector('#status')!.textContent = 'Unknown game profile.';
  const problem = document.querySelector<HTMLParagraphElement>('#error')!;
  problem.textContent = 'Choose a registered game by reopening the player without the game parameter.';
  problem.hidden = false;
  throw new Error('Unknown game profile.');
}
const profile: GameProfile = selectedProfile;
document.title = `${profile.title} — DOS Player`;
document.querySelector('h1')!.textContent = profile.title;
document.querySelector('#dos')!.setAttribute('aria-label', `${profile.title} game window`);
const picker = document.querySelector<HTMLSelectElement>('#game')!;
for (const game of profiles) { const option = document.createElement('option');
  option.value = game.id; option.textContent = game.title; picker.append(option); }
picker.value = profile.id;
picker.addEventListener('change', () => { location.search = `?game=${encodeURIComponent(picker.value)}`; });
function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id); if (!found) throw new Error(`Missing player element: ${id}`);
  return found as T;
}
const mount = element<HTMLDivElement>('dos');
const open = element<HTMLButtonElement>('open');
const pause = element<HTMLButtonElement>('pause');
const save = element<HTMLButtonElement>('save');
const stop = element<HTMLButtonElement>('stop');
const exportButton = element<HTMLButtonElement>('export');
const importButton = element<HTMLButtonElement>('import');
const recover = element<HTMLButtonElement>('recover');
const file = element<HTMLInputElement>('backup-file');
const status = element<HTMLOutputElement>('status');
const error = element<HTMLParagraphElement>('error');
const saved = element<HTMLSpanElement>('saved');
const volume = element<HTMLInputElement>('volume');
const store = new SaveStore();
let session: PlayerSession | undefined;
let releaseLock: (() => void) | undefined;

function showError(problem: unknown): void {
  error.textContent = problem instanceof Error ? problem.message : String(problem); error.hidden = false;
}
async function act(task: () => Promise<unknown>): Promise<void> {
  error.hidden = true; try { await task(); } catch (problem) { showError(problem); }
}
function download(bytes: Uint8Array): void {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/zip' }));
  const link = document.createElement('a'); link.href = url;
  link.download = `${profile.id}-${new Date().toISOString().replace(/[:.]/g, '-')}.dos-save`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function initialize(): Promise<void> {
  if (typeof window.Dos !== 'function') throw new Error('The emulator could not load. Reload the page and check the local server.');
  session = new PlayerSession(profile, store, window.Dos, mount);
  session.subscribe(snapshot => {
    const running = snapshot.state === 'running' || snapshot.state === 'paused';
    const stopped = snapshot.state === 'stopped';
    const available = !snapshot.busy;
    picker.disabled = !stopped || !available;
    open.disabled = !stopped || !available;
    pause.disabled = !running || !available;
    pause.textContent = snapshot.state === 'paused' ? 'Resume' : 'Pause';
    pause.setAttribute('aria-pressed', String(snapshot.state === 'paused'));
    save.disabled = !running || !available;
    stop.disabled = stopped || !available;
    stop.textContent = running ? 'Save & stop' : 'Close game';
    importButton.disabled = !stopped || !available;
    exportButton.disabled = !available;
    recover.disabled = !stopped || !available;
    volume.disabled = !running;
    status.textContent = snapshot.message;
    mount.dataset.state = snapshot.state;
    saved.textContent = snapshot.savedAt ? `Last saved ${new Date(snapshot.savedAt).toLocaleTimeString()}` : 'No browser save yet';
    if (snapshot.error) showError(snapshot.error);
    if (stopped) void store.recovery(profile.id).then(value => { recover.disabled = !value || session?.state !== 'stopped' || session.busy; }).catch(showError);
  });
  // js-dos has no public bundle-ready/error event; observe only its visible UI.
  new MutationObserver(() => {
    if (mount.querySelector('.pre-run-window')) session?.ready();
    const failure = mount.querySelector('.window .text-red-400');
    if (failure?.textContent) session?.failure(failure.textContent.trim());
  }).observe(mount, { subtree: true, childList: true });
  open.addEventListener('click', () => void act(() => session!.open()));
  pause.addEventListener('click', () => session?.pause());
  save.addEventListener('click', () => void act(() => session!.save()));
  stop.addEventListener('click', () => void act(() => session!.stop()));
  exportButton.addEventListener('click', () => void act(async () => { download(await session!.backup()); }));
  importButton.addEventListener('click', () => file.click());
  file.addEventListener('change', () => void act(async () => {
    const selected = file.files?.[0]; file.value = '';
    if (!selected) return;
    if (selected.size > MAX_SAVE_BYTES + 8192) throw new Error('The backup exceeds 16 MB.');
    await session!.restore(new Uint8Array(await selected.arrayBuffer()));
  }));
  recover.addEventListener('click', () => void act(() => session!.undoRestore()));
  volume.addEventListener('input', () => session?.volume(Number(volume.value)));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !session!.busy && ['running', 'paused'].includes(session!.state)) void session!.save().catch(showError);
  });
  window.addEventListener('beforeunload', event => {
    if (['running', 'paused'].includes(session!.state)) { event.preventDefault(); }
  });
  element<HTMLButtonElement>('fullscreen').addEventListener('click', () => void act(async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else throw new Error('Fullscreen is unavailable in this browser.');
  }));
  await session.open();
}

// Hold one player lease per origin. Save revisions also prevent stale writes.
if (navigator.locks) {
  void navigator.locks.request('dos-player-colonization', { ifAvailable: true }, async lock => {
    if (!lock) {
      status.textContent = 'This player is already open in another tab.';
      showError('Close the other player tab, then reload this one.'); return;
    }
    try {
      await initialize();
      await new Promise<void>(resolve => { releaseLock = resolve; });
    } catch (problem) { showError(problem); }
  }).catch(showError);
} else { void initialize().catch(showError); }
window.addEventListener('pagehide', () => releaseLock?.());
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
