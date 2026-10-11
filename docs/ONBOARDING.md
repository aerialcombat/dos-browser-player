# Architecture

The static HTML provides a compact toolbar and save controls around a dedicated
empty mount. TypeScript owns session state and transactional persistence; js-dos
continues to own canvas rendering, browser audio, keyboard/mouse input, and the
DOSBox-X worker. The emulator and synthesizer are unchanged from the confirmed fix.
The vendored player has one documented kiosk unload patch: its stock save modal
otherwise blocks programmatic stopping. See [runtime provenance](../vendor/README.md).

`games.json` separates a stable game ID and legacy save key from the
content version used to invalidate js-dos's bundle cache. `scripts/add-game.py`
updates that version; reload the page to read the new catalog.

## Saves

The `dos-player-saves` IndexedDB database contains `saves` and `recovery`, each
keyed by game ID. `idb` provides typed promises and transaction completion.
Every write compares a revision inside the transaction; a stale tab cannot
overwrite a newer save. Web Locks also prevent two new player pages on the same
origin from starting simultaneously. Old player pages do not participate in this
lock; close them before actively using the new player.

When no new record exists, the adapter reads the deployed save through
`DosProps.getLocalChanges('./colonization.jsdos.changes')` and copies it into
IndexedDB. Original OPFS data is retained. This compatibility path exists only
for persisted user data and ceases to run once the game has a new record.
It can be removed when legacy users have migrated or exported their saves.

Save persistence is serialized with exports, imports, and stopping. Saves run
every minute and are attempted when the page becomes hidden. Abrupt tab/process
closure cannot guarantee an asynchronous save; explicit Save & stop is the
reliable exit path. A failed write prevents stop and leaves live export available.

An emulator's changes ZIP can contain only directory entries. Those are treated
as no file changes, without advancing the save revision or producing a backup.

Backups use a versioned ZIP envelope with metadata and a SHA-256 checksum of the
inner changes ZIP. `fflate` handles compression and extraction. Import checks
format, game identity, checksum, paths, file count, and compressed/expanded limits
before replacing anything. The previous record is kept transactionally for recovery.
These backups require the corresponding game bundle and do not contain full
running emulator state or unchanged files already in that bundle.

## Development

Run `npm ci`, `npm run check`, and `npm run serve`. Node 22.18+ supports the
TypeScript tests directly; this implementation was checked with Node 26.5.
Vite builds an ES module and CSS into `assets/`. It is a build dependency, not
a runtime service. Serving the root keeps the original save origin unchanged.
There are no runtime CDN dependencies or cloud services. Service-worker/PWA
installation is a later milestone; the local server remains necessary.

`tests/emulator.test.ts` copies the official runtime to an owned CommonJS test
directory under `.derived/core-test`, then proves a saved-game file survives
persist/export/import/restart in the actual DOSBox-X core. It does not prove
browser audio fidelity, which still needs a listening comparison.

The pinned AudioWorklet output is extended with a per-session GainNode because
the public legacy volume setter does not reach that output. See vendor/README.md
for patch ownership and removal conditions. Cursor CSS hides the browser pointer
on the running canvas/input overlay while preserving the game pointer.

`src/main.ts` selects a known game profile by the `game` URL parameter; the root
URL uses the first catalog entry (the demo in public releases). The Game selector is enabled only after stopping.
Titles, accessible game labels and backup filenames follow the selected profile.
The existing origin-wide player lease also applies across games.

## Release setup

Run npm ci, npm run setup and npm run check. Setup downloads exact checksum-pinned
upstream packages; source distributions omit vendor binaries. A fresh catalog has
only the original demo. Local commercial profiles are retained only in the local
catalog. See RELEASING.md for artifact allowlists and corresponding upstream source.
The runtime catalog is fetched before creating PlayerSession; changing registered
games needs a page reload, not a JavaScript rebuild.
