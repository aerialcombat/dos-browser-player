# Code map

| File | Responsibility |
|---|---|
| `index.html` | Toolbar, empty player mount, save help and backup controls |
| `src/main.ts` | UI binding, player lease, downloads, file import, browser lifecycle |
| `src/session.ts` | Emulator session state, serialized save/export/restore/stop |
| `src/save-store.ts` | IndexedDB records, revisions and recovery transaction |
| `src/backup.ts` | Versioned ZIP envelope, checksum and archive validation |
| `src/runtime.ts` | Verified subset of public js-dos types and game profile |
| `src/player.css` | Responsive controls around the existing game display |
| `profiles/colonization.json` | Colonization identity, cache version and pinned runtime |
| `scripts/add-game.py` | User bundle registration and content hashing |
| `vite.config.ts` | Static ES module/CSS output, project-owned cache |
| `tests/saves.test.ts` | Backup validation, persistence, revision conflicts, recovery |
| `tests/session.test.ts` | Migration, session controls, failures, operation serialization |
| `tests/emulator.test.ts` | Actual DOSBox-X saved-file round-trip |
| `profiles/colonization.conf` | Confirmed graphics and sound configuration |
| `vendor/` | Pinned upstream js-dos and emulator assets |

Generated files are in `assets/`; diagnostic/test output is in `.derived/`.

- `tests/audio.test.ts`: patched worklet output routing, zero gain, clamping and cleanup.

- `profiles/`: additional game profile, DOS configuration and provenance.

## Open-source release modules

- `src/profiles.ts`: runtime catalog validation, independent of compiled UI.
- `games.json`: local catalog; release scripts substitute a demo-only catalog.
- `demo/`: original DOS COM assembly/binary and emulator configuration.
- `scripts/setup-runtime.py`: checksum-pinned runtime installation.
- `scripts/build-demo.py`: deterministic ZIP of the demo.
- `scripts/add-game.py`: safe user bundle registration with stable save keys.
- `scripts/collect-source.py`: immutable upstream source and submodule collection.
- `scripts/release.py`: explicit source/static allowlists and checksums.
- `docs/RELEASING.md`: source collection, rebuilding and release process.
