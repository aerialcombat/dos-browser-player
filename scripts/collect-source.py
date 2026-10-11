#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-only
# Copyright (C) 2026 DOS Browser Player contributors
"""Collect pinned upstream source, nested submodules and bundled JS source maps."""
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import tarfile
import urllib.request
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
cache = root / '.derived/release-inputs'
cache.mkdir(parents=True, exist_ok=True)
output = root / '.derived/upstream-source'
output.mkdir(parents=True, exist_ok=True)
manifest = []

def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'DOS-Browser-Player-source-collector'})
    with urllib.request.urlopen(request, timeout=60) as response: return response.read()

def collect(archive, repo, commit, prefix):
    cached = cache / (repo.replace('/', '-')+'-'+commit+'.tar.gz')
    if not cached.exists(): cached.write_bytes(fetch(f'https://codeload.github.com/{repo}/tar.gz/{commit}'))
    data = cached.read_bytes()
    manifest.append({'repo': repo, 'commit': commit, 'path': prefix, 'sha256': hashlib.sha256(data).hexdigest()})
    modules = None
    with tarfile.open(fileobj=io.BytesIO(data)) as source:
        for member in source.getmembers():
            if not member.isfile(): continue
            relative = PurePosixPath(*PurePosixPath(member.name).parts[1:])
            if relative == PurePosixPath('.gitmodules'): modules = source.extractfile(member).read().decode()
            # Upstream test game fixtures are not needed to modify/build the emulator.
            if any(part in ['test', 'tests', 'public'] for part in relative.parts) and relative.suffix.lower() in ['.zip','.jsdos','.exe','.com','.sav','.img','.iso','.vhd','.rom']:
                continue
            if relative.suffix.lower() in ['.exe', '.dll', '.so', '.dylib', '.a', '.lib', '.o', '.wasm']: continue
            if repo == 'floooh/sokol-tools-bin' and 'bin' in relative.parts: continue
            if relative.suffix.lower() == '.com' and b'\x00' in source.extractfile(member).read(): continue
            if '..' in relative.parts or relative.is_absolute(): raise ValueError('Unsafe upstream source path')
            archive.writestr(prefix+'/'+str(relative), source.extractfile(member).read())
    if modules:
        tree = json.loads(fetch(f'https://api.github.com/repos/{repo}/git/trees/{commit}?recursive=1'))
        if tree.get('truncated'): raise ValueError('Upstream tree truncated')
        links = {item['path']: item['sha'] for item in tree['tree'] if item['mode'] == '160000'}
        for block in modules.split('[submodule ')[1:]:
            path = re.search(r'path\s*=\s*(\S+)', block)
            url = re.search(r'url\s*=\s*(\S+)', block)
            if not path or path.group(1) not in links: continue
            github = re.fullmatch(r'(?:https://github.com/|git@github.com:)([^\s]+?)(?:\.git)?',url.group(1))
            if not github: raise ValueError('Only public GitHub source URLs are supported')
            collect(archive, github.group(1), links[path.group(1)], prefix+'/'+path.group(1))

version = json.loads((root/'package.json').read_text())['version']
path = output/f'dos-browser-player-{version}-upstream-source.zip'
with ZipFile(path, 'w', ZIP_DEFLATED) as archive:
    for package in json.loads((root/'vendor/runtime-lock.json').read_text()):
        collect(archive, 'caiiiycuk/'+package['name'], package['commit'], package['name'])
        npm = cache/f"{package['name']}-{package['version']}.tgz"
        if not npm.exists(): npm.write_bytes(fetch(package['archive']))
        data = npm.read_bytes()
        if hashlib.sha256(data).hexdigest() != package['sha256']: raise ValueError('Npm archive checksum failed')
        with tarfile.open(fileobj=io.BytesIO(data)) as source:
            for member in source.getmembers():
                if member.isfile() and (member.name.endswith('.map') or PurePosixPath(member.name).name in ['LICENSE','package.json']):
                    archive.writestr('npm-source/'+package['name']+'/'+member.name, source.extractfile(member).read())
    # CMake ExternalProject pins this separately from Git submodules.
    collect(archive, 'ptitSeb/gl4es', 'a744af14d4afbda77bf472bc53f43b9ceba39cc0', 'emulators/external/gl4es')
    collect(archive, 'cubiclesoft/js-fileexplorer', 'b81b0ca131abd50243ca85054af070a35293e346', 'file-explorer-license-provenance')
    for name in ['idb','fflate']:
        # Include preferred dependency source, not only compiled wrapper output.
        for file in (root/'node_modules'/name).rglob('*'):
            if file.is_file(): archive.write(file,'wrapper-dependencies/'+name+'/'+file.relative_to(root/'node_modules'/name).as_posix())
    archive.writestr('SOURCE-MANIFEST.json', json.dumps(manifest,indent=2)+'\n')
    archive.write(root/'docs/RELEASING.md','BUILD-INSTRUCTIONS.md')
print(f'Collected {len(manifest)} immutable upstream trees: {path}')
