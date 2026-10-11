# Build milestones

## Implemented

- TypeScript adapter over the confirmed DOSBox-X WASM runtime.
- Pause/resume, volume, save-and-stop, and repeated session lifecycle.
- Transactional local saves, deployed OPFS save migration, revision conflict checks.
- Backup export/import, validation, and previous-save recovery.
- Second local game profile and safe game selection after stopping.
- Automated storage/session failure tests and an actual emulator saved-file round-trip.

- GPL v2 source release, original demo, generic catalog and user bundle registration.
- Explicit demo-only static/source packaging and pinned upstream source collection.

## Next

1. Optional browser bundle upload; CLI registration is implemented.
2. Diagnostics: startup phase reporting, asset/version checks, downloadable
   troubleshooting report, and browser audio-state inspection.
3. Offline installation: service worker, complete versioned asset cache, coordinated
   updates, and save-preserving update tests.
4. Profile before adding Rust modules. Add Go only if cross-device sync is wanted.

Full emulator-state snapshots, cloud sync, and a new emulator are outside this
first milestone. Build one supported player path; remove obsolete code as its
replacement becomes proven. No hosting or repository administration is configured.
