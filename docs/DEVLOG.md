# Development log

## 0.2.0 — 2026-10-12 — Reusable open-source release

Licensed original code/demo under GPL-2.0-only, preserving upstream runtime terms.
Added dated runtime modification notices, exact package/source pins and an explicit
source/static archive allowlist. Added a source collector for pinned upstream trees,
native submodules and bundled dependency source maps. Commercial games and saves
are excluded from all release artifacts.

Replaced compiled game imports and the Colonization-specific rebuild script with
a runtime games.json catalog and CLI registration of user .jsdos bundles. Existing
local IDs, save keys, database and origin lock stay unchanged for deployed saves.
The public catalog contains only an original DOS assembly demo; real-core tests now
use its DEMO.SAV and need no commercial data. Twelve tests and the build pass.
See RELEASING.md for artifact and clean-checkout validation instructions.

## 0.1.0 — 2026-10-11 — Player sessions and portable saves

The user confirmed the corrected Colonization graphics and music before this
change. The player now has a small TypeScript control layer around that same
DOSBox-X/Nuked OPL stack. Audio, rendering and input remain upstream-owned.

Added local IndexedDB saves with revision checks and transactional recovery,
one-time deployed-save migration, serialized persistence, portable checked
backups, and safe stopping. Directory-only changes archives are treated as no
changes, an edge case found using the actual browser emulator.

Dependencies: pinned Vite/TypeScript for build checking, `idb` for transactional
browser storage, `fflate` for ZIP handling, and `fake-indexeddb` for meaningful
storage tests. Native Node tests avoid another test framework. The real core
test bridges upstream's CommonJS loader in owned `.derived` output.

The original bundle and emulator hashes are retained. The rebuild script now
updates `game-profile.json` instead of matching inline HTML. The old inline
player implementation and unasserted CDP smoke scripts are superseded.
Browser testing found js-dos's kiosk unload/save modal deadlock. A small idempotent
patch skips that modal only in kiosk mode; our adapter already owns persistence.
Core exit is acknowledged before hiding the player. The patch has an explicit
upstream-upgrade review/removal condition in `vendor/README.md`.

See [architecture](ONBOARDING.md), [API](API.md), and [milestones](PROGRESS.md).

### Volume and single cursor

Fixed the disconnected volume slider by routing the active AudioWorklet through a
per-session GainNode, with output cleanup when its transport exits. Eleven tests
pass, including the actual patched worklet factory and stop/reopen volume state.
Safari native input reaches volume zero and restores it to one; its audio
indicator disappears at zero and returns after restoring volume. The user also
confirmed that volume now works.

The running game canvas and mouse overlay hide the host cursor with scoped CSS.
The game still owns input and draws its pointer; player controls and paused
sessions retain the normal browser pointer.

The first cursor selector assumed an SDK class that desktop canvases do not
have. Live DOM inspection found an unclassed CANVAS with computed cursor `auto`.
The rule now targets the actual canvas tag, plus the mobile input overlay; the
stylesheet URL is versioned so reloads receive the correction.
Browser verification now reads `cursor: none` on the running desktop canvas,
`auto` when paused, and `pointer` on the Save button. Resume restores `none`.


### Second game: Lost Dutchman Mine

Added a known-profile selector and URL selection for Lost Dutchman Mine (1989
DOS), using the existing session, save store and backup format. Default/root
Colonization profile and its save key remain stable. Game selection requires a
stopped session; names and backup filenames follow the profile. Both commercial
bundles stay outside source distribution.

Chrome verification reached VGA town gameplay and the mouse-driven save menu.
Created slot 6 (the recorded name is WAP; one rapid test keystroke was missed),
persisted it through the wrapper, exported the backup, stopped and restarted.
The backup contains LDMSAVE.LDM (256 bytes) and LDMSAVE6.SAV (6066 bytes). An added
real-core test loads those browser-created changes into a fresh DOSBox-X instance,
checks both files byte for byte, and rejects import under Colonization's game ID.
All 12 tests and the production build pass. Browser reports audio playing; sound
fidelity has not been assessed by listening. This is a compatibility smoke test,
not a complete playthrough or a distributable game demo.

Source/archive provenance and settings are documented in profiles/README.md.
