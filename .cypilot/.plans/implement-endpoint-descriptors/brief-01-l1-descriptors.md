# Compilation Brief: Phase 1/5 — L1 Endpoint Descriptors (@hai3/api)

--- CONTEXT BOUNDARY ---
Disregard all previous context. This brief is self-contained.
Read ONLY the files listed below. Follow the instructions exactly.
---

## Phase Metadata
```toml
[phase]
number = 1
total = 5
type = "implement"
title = "L1 Endpoint Descriptors (@hai3/api)"
depends_on = []
input_files = ["packages/api/src/types.ts", "packages/api/src/BaseApiService.ts", "packages/api/src/protocols/RestProtocol.ts", "packages/api/src/index.ts"]
output_files = ["packages/api/src/types.ts", "packages/api/src/BaseApiService.ts", "packages/api/src/index.ts"]
outputs = []
inputs = []
```

## Load Instructions
1. **ADR-0018**: Read `architecture/ADR/0018-endpoint-descriptor-cache-abstraction.md` (~200 lines)
   - Runtime read → Task: understand design decisions and descriptor interface
2. **API types**: Read `packages/api/src/types.ts` (~full file)
   - Runtime read → Task: find where to add EndpointDescriptor types
3. **BaseApiService**: Read `packages/api/src/BaseApiService.ts` (~350 lines)
   - Runtime read → Task: add query/queryWith/mutation methods
4. **RestProtocol**: Read `packages/api/src/protocols/RestProtocol.ts` (~530 lines)
   - Runtime read → Task: understand HTTP method signatures for descriptor.fetch
5. **API index**: Read `packages/api/src/index.ts` (~full file)
   - Runtime read → Task: add new type exports
6. **Code checklist**: Read `.cypilot/.core/requirements/code-checklist.md` (lines 1-80)
   - Inline → Rules section: quality requirements

**Do NOT load**: framework, react, MFE files, or test files.

## Compile Phase File
Write to: `.cypilot/.plans/implement-endpoint-descriptors/phase-01-l1-descriptors.md`

Required sections: TOML frontmatter, Preamble, What, Prior Context, User Decisions, Rules, Input, Task, Acceptance Criteria, Output Format.

## Context Budget
- Phase file target: ≤ 500 lines
- Inlined content estimate: ~100 lines (code checklist extract)
- Total execution context: ~1400 lines (phase + source files)
- Budget: OK

## After Compilation
Report: "Phase 1 compiled → phase-01-l1-descriptors.md (N lines)"
Then apply context boundary and proceed to the next brief.
