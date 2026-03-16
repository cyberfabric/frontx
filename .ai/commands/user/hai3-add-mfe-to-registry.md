# hai3:add-mfe-to-registry - Register New MFE

## Overview

MFEs are **auto-discovered** — there is no manual registry. Once you create an MFE package
in `src/mfe_packages/`, the system picks it up automatically.

## How Auto-Discovery Works

`scripts/dev-all.ts` scans `src/mfe_packages/*/` at startup:
1. Reads each package's `package.json` for a `--port NNNN` argument in the `preview` or `dev` script
2. Builds a `concurrently` command for all found packages
3. Starts everything in parallel — no manual registration needed

`scripts/generate-mfe-manifests.ts` similarly scans for `mfe.json` files to build
`src/app/mfe/generated-mfe-manifests.ts` (static imports for Vite).

## Steps to Add a New MFE

1. Create the MFE package (see `hai3-new-mfe.md`)
2. Ensure its `package.json` has a `dev` script (or `preview` if no `dev`) with a unique `--port NNNN`
3. Run `npm run dev:all` — the new MFE is picked up automatically

**No changes to any registry file required.**

## Excluded Packages

The following folders are excluded from discovery:
- Any folder starting with `_` (e.g. `_blank-mfe`)
- `shared`
- Any folder starting with `.`

## Related Commands

- `hai3-new-mfe.md` — create a new MFE package
- `hai3-dev-all.md` — dev server orchestration details
