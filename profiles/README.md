# Game configuration profiles

The generic player reads `games.json` at startup. The public source and static
release contain only the original GPL demo profile. The local development catalog
also has Colonization and Lost Dutchman Mine, retaining their deployed IDs and
save keys. Stop before selecting a different game; use `/?game=<id>` for a link.

JSON profiles in this directory are templates; they contain settings, not game
files. To add a game, create a .jsdos ZIP with `.jsdos/dosbox.conf` and your DOS
files, then run `npm run bundle -- /path/game.jsdos --id game --title "Game"`.
The bundle command registers it in the runtime catalog and hashes its content.

## Confirmed local games

Colonization: DOSBox-X with `oplemu=nuked`, mixer/OPL rate 48000 Hz, mixer blocks
512, 8000 cycles, scaler none. Canvas rendering, pixelated scaling and 4:3 display;
DOSBox aspect correction disabled. Graphics, MIDI/OPL music, volume and the single
in-game mouse cursor were confirmed by the user.

Lost Dutchman Mine: `lost-dutchman-mine.conf` runs LDM.EXE from `ldm/` at 3000 cycles,
with PC speaker enabled. Press 3 for VGA at startup. The in-game disk menu/F6 saves.
Town gameplay, mouse control, browser save/reopen and real-core restoration of the
browser-created slot 6 were verified; the user confirmed it works well.

The local DOS archive came from the normal download link at
https://www.myabandonware.com/game/lost-dutchman-mine-p0 on 2026-10-11. This is
provenance of the local compatibility check, not a redistribution license. Neither
commercial game, its source archive nor any personal backup belongs in a release.
