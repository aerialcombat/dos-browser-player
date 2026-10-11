#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-only
# Copyright (C) 2026 DOS Browser Player contributors
"""Register a user-owned .jsdos bundle without changing stable save identities."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
from zipfile import ZipFile
root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('bundle', type=Path)
parser.add_argument('--id', required=True, help='Stable save identity, e.g. my-game')
parser.add_argument('--title', required=True)
args = parser.parse_args()
if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', args.id):
    parser.error('Use lowercase letters, digits and hyphens for the game ID.')
if args.id == 'demo':
    parser.error('The demo ID is reserved.')
with ZipFile(args.bundle) as archive:
    names = archive.namelist()
    if '.jsdos/dosbox.conf' not in names:
        parser.error('Bundle must contain .jsdos/dosbox.conf.')
    for name in names:
        if name.startswith('/') or '\\' in name or '..' in name.split('/') or ':' in name:
            parser.error('Bundle contains an unsafe path.')
    if archive.testzip() is not None:
        parser.error('Bundle integrity check failed.')
catalog = root / 'games.json'
games = json.loads(catalog.read_text()) if catalog.exists() else []
existing = next((game for game in games if game['id'] == args.id), None)
# Updating an existing game's bundle retains its deployed URL and save key.
destination = root / (existing['bundle'].removeprefix('./') if existing else f'{args.id}.jsdos')
if destination.resolve().parent != root or destination.suffix != '.jsdos':
    parser.error('Existing bundle must be a root-level .jsdos file.')
if args.bundle.resolve() != destination.resolve():
    staged = root / '.derived' / 'add-game.jsdos'
    staged.parent.mkdir(exist_ok=True)
    shutil.copyfile(args.bundle, staged)
    staged.replace(destination)
profile = {'id': args.id, 'title': args.title, 'bundle': './'+destination.name,
           'version': hashlib.sha256(destination.read_bytes()).hexdigest()[:12],
           'saveKey': existing['saveKey'] if existing else './'+destination.name+'.changes',
           'backend': 'dosboxX', 'runtime': '8.5.3', 'emulators': '8.5.2'}
games = [profile if game['id'] == args.id else game for game in games]
if not existing: games.append(profile)
catalog.write_text(json.dumps(games, indent=2)+'\n')
print(f"Registered {args.title}. Open /?game={args.id}; saves use {profile['saveKey']}.")
