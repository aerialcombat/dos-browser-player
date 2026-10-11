#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-only
# Copyright (C) 2026 DOS Browser Player contributors
"""Package the original GPL demo; NASM is needed only when changing its source."""
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo
root = Path(__file__).resolve().parent.parent
with ZipFile(root / 'demo.jsdos', 'w', ZIP_DEFLATED) as archive:
    for source, destination in [('demo/demo.com', 'DEMO.COM'), ('demo/dosbox.conf', '.jsdos/dosbox.conf')]:
        info = ZipInfo(destination, (2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        archive.writestr(info, (root / source).read_bytes())
profile_path = root / 'profiles/demo.json'
profile = json.loads(profile_path.read_text())
profile['version'] = hashlib.sha256((root / 'demo.jsdos').read_bytes()).hexdigest()[:12]
profile_path.write_text(json.dumps(profile, indent=2)+'\n')
catalog = root / 'games.json'
if catalog.exists():
    games = json.loads(catalog.read_text())
    games = [profile if game['id'] == 'demo' else game for game in games]
    catalog.write_text(json.dumps(games, indent=2)+'\n')
print('Built the redistributable demo.jsdos')
