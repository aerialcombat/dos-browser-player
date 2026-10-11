# Release DOS Browser Player

## Artifacts

`npm run release` validates the player and writes three archives under
`.derived/releases/` plus SHA256SUMS:

- `dos-browser-player-0.2.0-source.zip`: original source, demo source/binary,
  profiles, license/notices, lockfiles and build scripts. No vendored executable
  runtime. `npm ci && npm run setup && npm run check` builds a clean checkout.
- `dos-browser-player-0.2.0-player.zip`: static player, pinned patched runtime,
  demo only, catalog and documentation/licenses.
- `dos-browser-player-0.2.0-upstream-source.zip`: exact upstream sources and native
  submodule trees, build scripts, bundled JavaScript dependency source maps and
  licenses. This accompanies the static executable release.

The packer uses an explicit allowlist and writes a demo-only games.json. Local
commercial bundles, saves, diagnostics, node_modules and local catalog never enter
these archives. Do not publish the entire working directory or use a broad git add.

## Upstream source collection

Run `python3 scripts/collect-source.py` before release. It fetches immutable source
commits and recursively collects submodules from public HTTPS GitHub URLs under
`.derived/upstream-source/`. The manifest records the commit and archive checksum.
It also preserves source maps from the pinned npm packages to provide the bundled
JavaScript sources. The collector excludes upstream game test fixtures and compiled
build outputs. It never copies our commercial games or personal saves.

## Rebuild upstream

js-dos: unpack its pinned tree, install its package dependencies using its lockfile,
then `yarn run build`. Use the pinned emulators dist under its `public/emulators/`.

emulators: the source tree includes its submodules in place. Upstream's build uses
Node 22, Yarn, CMake, Ninja and Emscripten 5.0.2. After activating that Emscripten
SDK, run `yarn` and `yarn run gulp production`. See its gulpfile.ts and CMakeLists.txt
for target-specific builds. Compiling all optional backends may need additional
upstream toolchains; this player serves only DOSBox-X and libzip. The upstream
build embeds timestamps, so a rebuild need not be byte-identical to npm binaries.
Apply `scripts/patch-runtime.py` to the resulting browser JavaScript in vendor/.

## Publish

Publish all three archives and SHA256SUMS together, preserving attribution and
corresponding source. A public GitHub source repository can contain the source
archive's contents. The public source repository is github.com/aerialcombat/dos-browser-player.
Hosting, CI and protection are not configured by these scripts.

Before each release, extract the source into an owned `.derived/` directory and
run the setup/check commands there. Browser-test the demo, volume, cursor, save,
stop/reopen and backup restore. Existing saves belong to their exact browser origin;
serve local upgrades at http://127.0.0.1:8123 to preserve the deployed browser data.
