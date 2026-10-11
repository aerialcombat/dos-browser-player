# Contributing

Use Node 22.18+ (Node 24 or 26 recommended) and Python 3. Run:

```sh
npm ci
npm run setup
npm run check
npm run serve
```

The demo is original GPL v2 code. To edit it, install NASM and run
`nasm -f bin demo/demo.asm -o demo/demo.com`, then `npm run setup`.

Keep changes focused and document behavior in docs/. Tests must run without
commercial games or private saves. Never submit game files, save backups, local
catalogs or diagnostics. Runtime changes must retain the pinned checksums and
reviewed patches; follow vendor/README.md before upgrading.

Contributions to original project code are under GPL-2.0-only. Preserve upstream
copyright/license notices. No contributor agreement is required.

This project has no automatic deployment or declared merge authority. Do not add
CI workflows, repository protection or deployment settings without owner approval.
