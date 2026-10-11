# Vendored runtime

Player: js-dos 8.5.3 from the official npm package.
Emulator assets: emulators 8.5.2 from the official npm package.
Both packages declare GPL-2.0; the commercial game bundle is separate and local.

Sources: [js-dos](https://github.com/caiiiycuk/js-dos),
[emulators](https://github.com/caiiiycuk/emulators),
[DOSBox-X](https://github.com/joncampbell123/dosbox-x).

## Local player patch

`scripts/patch-runtime.py` contains the complete reversible source transformation
for this vendored player. In 8.5.3, the Save-dialog component installs an unload
handler even in kiosk mode. The handler waits for a modal response before the
core may finish exiting. `DosProps.stop()` hides that modal first, leaving the
exit promise unresolved. An external player that already saved cannot stop.

The patch skips only that component when the initial `kiosk` option is true.
The owning adapter saves explicitly before exit. This shutdown patch leaves non-kiosk behavior unchanged. The separate output
gain patch below leaves synthesis and rendering unchanged. Kiosk is fixed for the lifetime
of our session; do not toggle it on an existing patched player instance.

Reapply the script after replacing the pinned player. It is idempotent and refuses
an unrecognized component signature. Reassess it against the upstream source
before upgrading, and remove it when upstream kiosk shutdown supports an external
save owner. No runtime compatibility implementation is added.

DOSBox-X WASM SHA-256:
`8e6bbbee26a70433c3a78d0f3a3152a8d7762d016cd2024f6f13d69e93e9f689`

## AudioWorklet output gain

The same script adds a per-session `audioOutput` option to the player factory and
passes it through the direct/worker transports to the AudioWorklet factory.
In these pinned versions, `DosProps.setVolume()` controls only the legacy
ScriptProcessor output; the active AudioWorklet connects straight to the speakers.
The patch inserts a standard Web Audio GainNode after the worklet. The adapter
receives its controller and applies the slider's 0–1 level, including true mute.
Transport exit disconnects the nodes, removes resume listeners, and closes the
AudioContext. The worklet's sample processing, synthesis and core are unchanged.
Remove this extension when upstream exposes volume for the worklet output.
`tests/audio.test.ts` exercises the actual patched factory and its cleanup;
`tests/session.test.ts` covers volume across session replacement.
