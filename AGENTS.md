# DOS browser player

Original development lives in a local standalone folder. Public source is hosted
at github.com/aerialcombat/dos-browser-player. Preserve local games/saves; never
publish the full development folder. Use git start for writing in a Git checkout,
commit explicit paths and propose changes through pull requests. The bootstrap
repository uses its existing master branch as integration trunk.

## Delivery policy

GitHub hosts source and pull requests. There is no automated merge authority,
protected status publisher, CI or deployment lane. Review/merge is manual; do not
configure CI workflows, protection, auto-merge or repository settings without an
explicit owner request for that exact administrative action. Local validation is
npm run check plus clean-source setup and archive inspection in docs/RELEASING.md.

## Architecture and constraints

- TypeScript controls wrap pinned js-dos 8.5.3 / emulators 8.5.2 / DOSBox-X WASM.
- Keep js-dos's synthesis, rendering, and input pipeline. Output gain and
  lifecycle patches are owned by scripts/patch-runtime.py / vendor/README.md. The user confirmed correct
  graphics and sound with the profile documented in README.md.
- Keep the element passed to `Dos()` empty. Its return value is `DosProps`;
  the emulator `CommandInterface` arrives separately through `ci-ready`.
- Keep `http://127.0.0.1:8123` and the legacy save key stable. Changing host/port
  changes browser storage. Bundle cache versions must not become save identities.
- Treat saves as user data. Never restore while a session is open. Failed writes
  must leave the live session and previous stored save available for export.
- Use the public SDK. The visible pre-run/error observations are the only DOM
  dependency, because this SDK version has no public bundle-ready/error event.
- Commercial game files remain local. Ignore the bundle, game sources, backups,
  build outputs, and diagnostics in future version control.

## Commands

- `npm run setup` downloads checksum-pinned runtime packages and builds the free demo.
- `npm ci` installs the locked dependencies (Node 22.18+ or newer).
- `npm run check` runs persistence/backup/session tests, a real core demo round-trip,
  TypeScript checking, and the production build.
- `npm run serve` serves the built player on the original origin.
- `npm run bundle -- /path/game.jsdos --id game --title "Game"` registers a user bundle.
- `npm run release` packages demo-only archives; see docs/RELEASING.md.
- Browser checks use the computer-use surface; preserve other player tabs.
- All scratch output belongs under `.derived/`; compiled assets under `assets/`.

See [README](README.md), [architecture](docs/ONBOARDING.md),
[code map](docs/CODE-INDEX.md), [API](docs/API.md),
[progress](docs/PROGRESS.md), and [development log](docs/DEVLOG.md).
