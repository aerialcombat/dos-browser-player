#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-only
# Copyright (C) 2026 DOS Browser Player contributors
"""Create source/static release archives from explicit allowlists, never local games."""
from pathlib import Path
import hashlib
import json
import shutil
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
version = json.loads((root/'package.json').read_text())['version']
prefix = f'dos-browser-player-{version}'
output = root/'.derived/releases'; output.mkdir(parents=True,exist_ok=True)
demo = json.loads((root/'profiles/demo.json').read_text())
demo['version'] = hashlib.sha256((root/'demo.jsdos').read_bytes()).hexdigest()[:12]
source_files = ['.gitignore','AGENTS.md','README.md','LICENSE','THIRD-PARTY-NOTICES.md','CONTRIBUTING.md',
                'package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html',
                'vendor/README.md','vendor/runtime-lock.json','.github/PULL_REQUEST_TEMPLATE.md']
source_dirs = ['src','tests','docs','scripts','demo','licenses','profiles']
# Profiles are settings only. Game data and backups are never taken from a directory.
with ZipFile(output/f'{prefix}-source.zip','w',ZIP_DEFLATED) as archive:
    for name in source_files: archive.write(root/name,name)
    for name in source_dirs:
        for file in sorted((root/name).rglob('*')):
            if file.is_file() and '__pycache__' not in file.parts and file.suffix != '.pyc': archive.write(file,file.relative_to(root).as_posix())
    archive.writestr('games.json',json.dumps([demo],indent=2)+'\n')
upstream = root/'.derived/upstream-source'/f'{prefix}-upstream-source.zip'
if not upstream.exists(): raise SystemExit('Run python3 scripts/collect-source.py before releasing the static runtime.')
shutil.copyfile(upstream,output/upstream.name)
static_files = ['index.html','README.md','LICENSE','THIRD-PARTY-NOTICES.md','demo.jsdos',
                'vendor/README.md','vendor/runtime-lock.json','vendor/js-dos.js','vendor/js-dos.css']
with ZipFile(output/f'{prefix}-player.zip','w',ZIP_DEFLATED) as archive:
    for name in static_files: archive.write(root/name,name)
    for directory in ['assets','licenses']:
        for file in sorted((root/directory).rglob('*')):
            if file.is_file(): archive.write(file,file.relative_to(root).as_posix())
    for name in ['emulators.js','wdosbox-x.js','wdosbox-x.wasm','wlibzip.js','wlibzip.wasm',
                 'file-explorer.js','file-explorer.css','fileexplorer_actions.woff','fileexplorer_sprites.png']:
        archive.write(root/'vendor/emulators'/name,'vendor/emulators/'+name)
    archive.write(root/'docs/RELEASING.md','docs/RELEASING.md')
    archive.writestr('games.json',json.dumps([demo],indent=2)+'\n')
artifacts = [output/f'{prefix}-{kind}.zip' for kind in ['source','player','upstream-source']]
(output/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in artifacts))
for file in artifacts: print(f'{file}: {file.stat().st_size:,} bytes')
