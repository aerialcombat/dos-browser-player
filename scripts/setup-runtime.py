#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-only
# Copyright (C) 2026 DOS Browser Player contributors
"""Fetch exact upstream runtime packages and apply our reviewed local patches."""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile
import urllib.request
root = Path(__file__).resolve().parent.parent
cache = root / '.derived' / 'release-inputs'
cache.mkdir(parents=True, exist_ok=True)
files = {
    'js-dos': ['js-dos.js', 'js-dos.css', 'emulators/file-explorer.js', 'emulators/file-explorer.css', 'emulators/fileexplorer_actions.woff', 'emulators/fileexplorer_sprites.png'],
    'emulators': ['emulators.js', 'wdosbox-x.js', 'wdosbox-x.wasm', 'wlibzip.js', 'wlibzip.wasm'],
}
for package in json.loads((root / 'vendor/runtime-lock.json').read_text()):
    path = cache / f"{package['name']}-{package['version']}.tgz"
    if not path.exists():
        with urllib.request.urlopen(package['archive'], timeout=60) as response:
            path.write_bytes(response.read())
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != package['sha256']:
        raise SystemExit(f'Runtime checksum failed: {path.name}; remove it and retry.')
    directory = root / 'vendor' / ('emulators' if package['name'] == 'emulators' else '')
    directory.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(data)) as archive:
        for name in files[package['name']]:
            (directory / name).parent.mkdir(parents=True, exist_ok=True)
            (directory / name).write_bytes(archive.extractfile('package/dist/' + name).read())
subprocess.run(['python3', str(root / 'scripts/patch-runtime.py')], check=True)
print('Verified and installed js-dos 8.5.3 / emulators 8.5.2')
