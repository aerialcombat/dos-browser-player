# Internal player API

`PlayerSession(profile, store, Dos, mount)` wraps the public js-dos player.
`subscribe(listener)` immediately reports a snapshot and returns an unsubscribe
function. Snapshots contain state, busy status, message, save time and error.

| Operation | Behavior |
|---|---|
| `open()` | Mounts js-dos, loads/migrates stored files, waits for stock Play gesture |
| `pause()` | Toggles running/paused through `DosProps.setPaused` |
| `volume(value)` | Clamps 0–1 and retains the setting across sessions |
| `save()` | Persists changed files; reports success only after storage completion |
| `stop()` | Persists first, exits the core and clears the mount; write failure leaves it open |
| `backup()` | Exports live changed files or the stored record, without requiring a successful storage write |
| `restore(bytes)` | Validates and replaces saved files only while stopped; keeps the previous record |
| `undoRestore()` | Swaps the recovery record into the current saved files while stopped |

Save/export/restore/stop operations are exclusive. A concurrent operation rejects
rather than racing persistence. Filesystem persistence is separate from the
game's own Save command and from DOSBox-X emulator-state snapshots.

`SaveStore.put(gameId, bytes, bundleVersion, expectedRevision, preserve)` commits
only if the revision still matches. With `preserve=true`, the previous record
and replacement are written in the same transaction.

Backup v1: `.dos-save` ZIP containing exactly `manifest.json` and `changes.zip`.
Manifest fields: `format=dos-player-save`, `version=1`, `gameId`, `createdAt`,
`bundleVersion`, `runtime`, and hexadecimal `sha256`. Maximum changes ZIP is
16 MiB, expanded changes are limited to 64 MiB and 4096 entries. Paths must be
relative and cannot traverse parent directories. Directory-only saves are empty.

Upstream references: [Player API](https://js-dos.com/player-api.html),
[Command Interface](https://js-dos.com/command-interface.html),
[filesystem persistence](https://js-dos.com/save-load.html).

The local runtime extension `audioOutput` supplies an initial output level and an
`onReady({setVolume})` callback. The session controls this per-instance GainNode;
the upstream legacy `DosProps.setVolume` is not used for worklet output.

`games.json` is a nonempty array of GameProfile records, validated by readProfiles.
Fields: id, title, bundle, version, saveKey, backend, runtime, emulators.
IDs are unique lowercase names; bundle is a root-relative `./name.jsdos` URL.
Only DOSBox-X / js-dos 8.5.3 / emulators 8.5.2 are supported.
`?game=<id>` selects a registered profile; otherwise the first profile is used.
The deployed local save IDs, IndexedDB database and origin lease remain stable.
