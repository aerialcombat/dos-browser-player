#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-only
# Copyright (C) 2026 DOS Browser Player contributors
"""Reviewed, signature-checked fixes for the pinned browser runtime."""
from pathlib import Path

root = Path(__file__).resolve().parent.parent

def patch(path, replacements):
    source = path.read_text()
    for original, replacement in replacements:
        if source.count(replacement) == 1:
            continue
        if source.count(original) != 1:
            raise SystemExit(f"Unrecognized runtime signature in {path.name}; review patch before upgrading")
        source = source.replace(original, replacement, 1)
    notice = '/* Modified by DOS Browser Player contributors, 2026-10-12: kiosk shutdown and AudioWorklet output gain. GPL v2; see LICENSE and vendor/README.md. */\n'
    if not source.startswith(notice): source = notice + source
    path.write_text(source)

patch(root / 'vendor/js-dos.js', [
    ('function Bl(e){const t=e.ci,n=Wr()',
     'function Bl(e){if(hi().options.kiosk)return null;const t=e.ci,n=Wr()'),
    ('audioWorklet:!0,sockdrivePreload:m',
     'audioWorklet:f.options.audioOutput??!0,sockdrivePreload:m'),
])
patch(root / 'vendor/emulators/emulators.js', [
    ('n.createAudioPort=async function(){let e;',
     'n.createAudioPort=async function(settings){let e;'),
    ('i.connect(s.destination);const o=',
     'const gain=s.createGain();i.connect(gain);gain.connect(s.destination);'
     'gain.gain.value=typeof settings==="object"?settings.volume:1;'
     'const output={setVolume(value){gain.gain.setValueAtTime(Math.min(1,Math.max(0,value)),s.currentTime)}};'
     'if(typeof settings==="object")settings.onReady(output);'
     'i.port.dispose=()=>{i.disconnect();gain.disconnect();document.removeEventListener("pointerdown",o,true);'
     'document.removeEventListener("keydown",o,true);s.close().catch(console.error)};const o='),
    ('c.audioPort=await(0,i.createAudioPort)()', 'c.audioPort=await(0,i.createAudioPort)(o)'),
    ('m=await(0,i.createAudioPort)()', 'm=await(0,i.createAudioPort)(r)'),
    ('exit:()=>{"undefined"!=typeof window&&window.removeEventListener("message",u)}',
     'exit:()=>{c.audioPort?.dispose?.();"undefined"!=typeof window&&window.removeEventListener("message",u)}'),
    ('exit:()=>{URL.revokeObjectURL(d),h.terminate()}',
     'exit:()=>{m?.dispose?.();URL.revokeObjectURL(d),h.terminate()}'),
])
print('Pinned kiosk shutdown and AudioWorklet volume patches verified')
