# Licensing and upstream source

DOS Browser Player's original wrapper, scripts and demo are copyright (C) 2026
DOS Browser Player contributors, licensed under **GPL-2.0-only**. You may use,
modify and redistribute them under [LICENSE](LICENSE). There is no warranty.
Commercial DOS games and user saves are not part of this release.

## Runtime

- js-dos 8.5.3: Alexander Guryanov and contributors; upstream declares GPL-2.0.
  Source: https://github.com/caiiiycuk/js-dos/tree/506dfd2a99f56bc4e393a716125ae94e58eb3fba
- emulators 8.5.2: Alexander Guryanov and contributors; upstream declares GPL-2.0.
  Source: https://github.com/caiiiycuk/emulators/tree/6bbf0925d221a7304ea8e0dda1e89b8dc01569b2
- DOSBox-X: the js-dos fork, embedded at commit
  `788fde99d3d451eab3621009186e5abe516f2b9c`, and its upstream contributors.
  Source: https://github.com/js-dos/dosbox-x/tree/788fde99d3d451eab3621009186e5abe516f2b9c
  Original project: https://github.com/joncampbell123/dosbox-x

- GL4ES: the OpenGL translation library pinned by the emulator CMake build at
  `a744af14d4afbda77bf472bc53f43b9ceba39cc0`. Source and original notices are in
  `emulators/external/gl4es` in the upstream source archive.
  https://github.com/ptitSeb/gl4es/tree/a744af14d4afbda77bf472bc53f43b9ceba39cc0

Original notices and component licenses remain in the accompanying upstream source
archive. These include the native libraries embedded in the WASM runtime. The
wrapper's license does not replace those notices or change their original terms.
`vendor/runtime-lock.json` pins package archives, checksums and source commits.

We modify two runtime JavaScript files for kiosk shutdown, AudioWorklet gain and
cleanup. Modified files carry a dated notice; `scripts/patch-runtime.py` is the
complete change, with its purpose and removal conditions in `vendor/README.md`.
The WASM binaries are unchanged from the official npm package.

- CubicleSoft Folder and File Explorer — copyright (C) 2020 CubicleSoft,
  MIT (upstream offers MIT or LGPL). Its JavaScript is readable source, retained
  in the js-dos tree. See [license](licenses/file-explorer.txt) and
  https://github.com/cubiclesoft/js-fileexplorer .

## Wrapper dependencies

- idb 8.0.4 — Jake Archibald, ISC; see [license](licenses/idb.txt).
  https://github.com/jakearchibald/idb
- fflate 0.8.3 — Arjun Barrett, MIT; see [license](licenses/fflate.txt).
  https://github.com/101arrowz/fflate

The source release includes the lockfile for build/test dependencies. Each retains
its own license. `npm ci` installs those development tools; they are not the DOS
emulator. The prebuilt player also includes idb and fflate in its JavaScript bundle.

## Release artifacts

The static player must be distributed alongside the wrapper source archive and
`dos-browser-player-0.2.0-upstream-source.zip`, from the same download location.
That archive includes pinned upstream source and native submodules, build scripts,
source maps containing the bundled JavaScript dependency sources, and licenses.
See [release instructions](docs/RELEASING.md) for rebuilding and redistribution.
Do not replace corresponding source with only a link to a moving upstream branch.
