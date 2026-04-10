# frontx:dev-all - Dynamic Dev Server Orchestration

## Overview

`npm run dev:all` automatically starts all MFE packages and the main application in parallel.
MFEs are **auto-discovered** by scanning `src/mfe_packages/` — no manual registration needed.

## How It Works

```
npm run dev:all
    ↓
1️⃣  scripts/generate-mfe-manifests.ts
    └─ Scans src/mfe_packages/*/mfe.json
    └─ Generates src/app/mfe/generated-mfe-manifests.ts (static imports for Vite)

2️⃣  scripts/dev-all.ts
    └─ Scans src/mfe_packages/*/package.json for --port in dev/preview scripts
    └─ Builds concurrently command for all discovered MFEs + main app

3️⃣  concurrently starts everything simultaneously
    ├─ Each MFE on its declared port
    └─ Main app (vite)
```

## Adding a New MFE

1. Create the package under `src/mfe_packages/my-new-mfe/`
2. Add a `dev` script (or `preview` if no `dev`) with a unique `--port NNNN` in its `package.json`:
   ```json
   {
     "scripts": {
       "dev": "vite --port 3040",
       "preview": "vite preview --port 3040"
     }
   }
   ```
3. Run `npm run dev:all` — the new MFE is picked up automatically

**No changes to any registry or config file required.**

## Excluding a Package

Folders starting with `_` (e.g. `_blank-mfe`), named `shared`, or starting with `.` are automatically excluded.
To skip a specific MFE temporarily, rename it to start with `_` or remove its `--port` script.

## Usage

```bash
# Start everything
npm run dev:all

# Start only the main app (no MFEs)
npm run dev

# Start a single MFE independently
cd src/mfe_packages/my-mfe
npm run dev
```

## Troubleshooting

### MFE not picked up by dev:all
- Check that its `package.json` has a `dev` or `preview` script with `--port NNNN`
- Check the folder name isn't in the excluded list (`_blank-mfe`, `shared`)

### dev:all command not working
```bash
# Verify concurrently is installed
npm ls concurrently

# Verify tsx is installed
npm ls tsx

# Verify the script exists
ls -la scripts/dev-all.ts
```

## Related Commands

- `frontx-new-mfe.md` — create a new MFE package
- `frontx-add-mfe-to-registry.md` — MFE registration overview
