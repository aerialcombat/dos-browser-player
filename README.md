# DOS Browser Player

An open-source browser player for DOS games, built with TypeScript around pinned
js-dos 8.5.3 and DOSBox-X WebAssembly (emulators 8.5.2). It provides pause/resume,
volume, fullscreen, local saves, portable backups and recovery of replaced saves.
No account, cloud service or runtime CDN is needed.

## Try it

The prebuilt player ZIP includes an original GPL DOS demo. Extract it and run
`python3 -m http.server 8123 --bind 127.0.0.1` in that directory. Open
http://127.0.0.1:8123, then press Play to enable browser audio.

In the demo, Space adds a point and S writes DEMO.SAV. Choose **Save to browser**,
then **Save & stop** and **Open game**. The demo loads its saved score automatically.
Download a backup to move the saved files to another browser or device.

## Build from source

Use Node 22.18+ (24 or 26 recommended), npm and Python 3:

```sh
npm ci
npm run setup
npm run check
npm run serve
```

Setup downloads checksum-pinned upstream runtime packages and applies reviewed
shutdown/audio fixes. The default source catalog contains only the freely
redistributable demo. NASM is required only to edit/rebuild its assembly source:
`nasm -f bin demo/demo.asm -o demo/demo.com`.

## Add your own game

Supply a `.jsdos` ZIP containing your DOS files and `.jsdos/dosbox.conf`, then:

```sh
npm run bundle -- /path/to/my-game.jsdos --id my-game --title "My Game"
```

Reload the player. Stop the current session before selecting another game in the
Game menu. A specific game can be opened with `/?game=my-game`. `games.json` is a
runtime catalog, so changing it does not require rebuilding the player. Keep each
game ID stable: it identifies browser saves and backups. Re-registering the same
ID updates the bundle hash while retaining its save key. Different editions that
cannot share saved files need different IDs.

[Profiles](profiles/README.md) includes tested configuration settings for
Colonization and Lost Dutchman Mine. Their commercial files are not included.

## Saves

Save inside the game first, then choose **Save to browser**. The wrapper stores
changed files every minute and when the page becomes hidden. Abrupt process or
tab closure cannot guarantee a final asynchronous write. **Save & stop** persists
before closing; storage failure leaves the game open and its backup export usable.

Stop before restoring a `.dos-save` backup. The previous browser save is retained
for **Recover previous save**. Backups contain changed files relative to the game
bundle, not a running emulator snapshot. They require the same compatible game.

Browser storage belongs to the exact origin. Keep http://127.0.0.1:8123 for existing
local saves; localhost, another port, a hosted website or another browser has
separate storage. Export/import moves progress across those boundaries. Only one
active player tab is allowed per origin; revision checks also reject stale writes.
Deployed js-dos OPFS saves are migrated through its public API when first opened.

## Release and contribute

The original wrapper and demo are GPL-2.0-only; see [LICENSE](LICENSE),
[third-party notices](THIRD-PARTY-NOTICES.md) and [contributing](CONTRIBUTING.md).
The runtime retains its upstream licenses. Distribute static player binaries with
both source archives, as described in [release instructions](docs/RELEASING.md).

`npm run check` runs the save, recovery, backup validation, session lifecycle,
actual AudioWorklet gain and real DOSBox-X file round-trip tests, then type-checks
and builds. Tests do not require commercial games or personal saves.

Architecture: [ONBOARDING](docs/ONBOARDING.md). Source map:
[CODE-INDEX](docs/CODE-INDEX.md). Internal API: [API](docs/API.md).
PWA installation, cloud sync and full emulator snapshots are not implemented.
