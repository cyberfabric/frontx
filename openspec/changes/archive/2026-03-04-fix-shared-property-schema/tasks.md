## 1. GTS Base Schema Fix

- [x] 1.1 Update `packages/screensets/src/mfe/gts/hai3.mfes/schemas/comm/shared_property.v1.json`: remove `supportedValues` property and its `required` entry. Add `"value": {}` property (unconstrained). `required` becomes `["id"]` only.

## 2. Convert Instance Files to Derived Schemas

The existing `theme.v1.json` and `language.v1.json` are currently GTS instances in the `instances/comm/` directory. They become derived schemas in the `schemas/comm/` directory.

- [x] 2.1 Create `packages/screensets/src/mfe/gts/hai3.mfes/schemas/comm/theme.v1.json`: derived schema using `allOf` from `shared_property.v1~`, constraining `value` to `{ "type": "string", "enum": ["default", "light", "dark", "dracula", "dracula-large"] }`. `$id`: `gts://gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1~`. Must include `$schema` field (marks it as a schema, not an instance per GTS Rule A).
- [x] 2.2 Create `packages/screensets/src/mfe/gts/hai3.mfes/schemas/comm/language.v1.json`: derived schema using `allOf` from `shared_property.v1~`, constraining `value` to `{ "type": "string", "enum": [...] }` with all 36 Language enum codes from `@hai3/i18n`. `$id`: `gts://gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1~`.
- [x] 2.3 Delete old instance files: `packages/screensets/src/mfe/gts/hai3.mfes/instances/comm/theme.v1.json` and `packages/screensets/src/mfe/gts/hai3.mfes/instances/comm/language.v1.json`.

## 3. GTS Loader Update

- [x] 3.1 Update `packages/screensets/src/mfe/gts/loader.ts`: remove imports of `themeSharedPropertyInstance` and `languageSharedPropertyInstance` from `instances/comm/`. Add imports of the new derived schemas from `schemas/comm/theme.v1.json` and `schemas/comm/language.v1.json`. Add them to `loadSchemas()` return array (under "Built-in derived types" alongside `extensionScreenSchema`). Remove `loadSharedProperties()` function entirely — it returned the old instances which no longer exist. Schema count changes from 11 to 13.
- [x] 3.2 Update `packages/screensets/src/mfe/plugins/gts/index.ts` (GtsPlugin constructor): remove the `loadSharedProperties()` call and its registration loop. The derived schemas are now loaded as part of `loadSchemas()`.

## 4. Constant ID Updates

The shared property constants become GTS type/schema IDs (add trailing `~`). Same names, same convention, just correct GTS semantics.

- [x] 4.1 Update `packages/screensets/src/mfe/constants/index.ts`: change `HAI3_SHARED_PROPERTY_THEME` to `'gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1~'` (added `~`). Change `HAI3_SHARED_PROPERTY_LANGUAGE` to `'gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1~'` (added `~`).
- [x] 4.2 Search for hardcoded literal strings of the old values (`gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1` and `gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1` without trailing `~`) in source and test files (excluding `openspec/`, `CLAUDE.md`, `llms.txt`). Update any occurrences to either use the constants or the new literal values with trailing `~`.

## 5. Runtime Validation in updateDomainProperty

- [x] 5.1 Update `packages/screensets/src/mfe/runtime/default-extension-manager.ts` `updateDomainProperty()`: **replace** the existing anonymous instance validation code (lines 373-386: the `__runtime` ephemeral ID, `type: propertyTypeId` field, and the associated "anonymous instance pattern" comments) with the named instance pattern. Construct a valid chained GTS instance ID: `const ephemeralId = "${propertyTypeId}hai3.mfes.comm.runtime.v1"`. Register the named instance via `this.typeSystem.register({ id: ephemeralId, value })` — no `type` field needed, gts-ts extracts the schema from the chained ID. Call `this.typeSystem.validateInstance(ephemeralId)`. If validation fails, throw with error details. If validation passes, proceed to store and propagate. The deterministic `ephemeralId` ensures each call overwrites the previous instance (no store growth). The old anonymous pattern code and comments must be fully removed, not left alongside the new code.
- [x] 5.2 Add unit tests for property value validation in `packages/screensets/__tests__/mfe/runtime/domain-properties.test.ts` (or a new file `property-validation.test.ts`): test valid theme value passes using named instance pattern `{ id: ephemeralId, value }`, invalid theme value throws, valid language value passes, invalid language value throws. Verify no `type` field is used in the registered instance.
- [x] 5.3 Remove the anonymous instance surrogate workaround from `packages/screensets/src/mfe/plugins/gts/index.ts`: delete the `if (!isValidGtsID(instanceId))` block (lines 130-153) that constructs a surrogate ID (`anon.instance.validation.proxy.v1`) and re-registers/re-validates under it. After task 5.1 converts all callers to the named instance pattern, this code path is dead — no caller will ever pass a non-GTS instance ID. Also remove the `isValidGtsID` import (line 21) if it is no longer used elsewhere in the file.
- [x] 5.4 Update the `TypeSystemPlugin` JSDoc in `packages/screensets/src/mfe/plugins/types.ts`: remove all references to the anonymous instance pattern (pattern b) from both the `register()` method docs (lines 110-115) and the `validateInstance()` method docs (lines 131-133). Delete the "(b) Anonymous instances" paragraphs, the `type` field examples, and the `__runtime` suffix examples. Keep only the named instance pattern (pattern a) documentation.

## 6. Property Propagation Cleanup (D6)

- [x] 6.1 Update `ExtensionDomainState` in `packages/screensets/src/mfe/runtime/extension-manager.ts`: change `properties: Map<string, SharedProperty>` to `properties: Map<string, unknown>`. Change `propertySubscribers: Map<string, Set<(value: SharedProperty) => void>>` to `Map<string, Set<(propertyTypeId: string, value: unknown) => void>>`.
- [x] 6.2 Update `packages/screensets/src/mfe/runtime/default-extension-manager.ts` `updateDomainProperty()`: store raw `value` (not wrapped `SharedProperty`) in `domainState.properties`. Notify subscribers with `(propertyTypeId, value)` instead of `(sharedProperty)`. Update `getDomainProperty()` to return `domainState.properties.get(propertyTypeId)` directly (no `.value` unwrap).
- [x] 6.3 Update `packages/screensets/src/mfe/bridge/ParentMfeBridge.ts`: change `propertySubscribers` type from `Map<string, (value: SharedProperty) => void>` to `Map<string, (propertyTypeId: string, value: unknown) => void>`. Update `receivePropertyUpdate(propertyTypeId, value)` to construct `SharedProperty` and forward to child bridge (wrapping happens here once, cleanly).
- [x] 6.4 Update `packages/screensets/src/mfe/runtime/default-runtime-bridge-factory.ts`: the domain subscriber lambda now receives `(propertyTypeId, value)` and calls `parentBridgeImpl.receivePropertyUpdate(propertyTypeId, value)` directly — no unwrapping from `SharedProperty` needed.
- [x] 6.5 Update `packages/screensets/src/mfe/bridge/ChildMfeBridge.ts`: `receivePropertyUpdate` already receives `SharedProperty` from parent — no change needed. Verify the child side is clean.
- [x] 6.6 Update all affected tests in `packages/screensets/__tests__/mfe/runtime/` to match the new subscriber signatures and raw value storage.

## 7. Dead Code Removal (D5)

- [x] 7.1 Delete `packages/screensets/src/mfe/properties/index.ts` (dead `SharedPropertiesProvider` class).
- [x] 7.2 Delete `packages/screensets/__tests__/mfe/properties/shared-properties.test.ts` (tests for dead class).
- [x] 7.3 Update `packages/screensets/__tests__/mfe/isolation/host-state-protection.test.ts`: replace all `SharedPropertiesProvider` usage with bridge-based property APIs. Remove the import.
- [x] 7.4 Remove any re-exports of `SharedPropertiesProvider` or `PropertyUpdateCallback` from barrel files if present (check `packages/screensets/src/mfe/index.ts`, `packages/screensets/src/index.ts`).

## 8. GTS Plugin Tests

- [x] 8.1 Update `packages/screensets/__tests__/mfe/plugins/gts/gts-plugin.test.ts`: remove tests asserting `supportedValues` on theme/language instances. Replace with tests asserting the new derived schema structure: (a) base schema has `value: {}` and no `supportedValues`, (b) derived theme schema is registered and constrains value to 5 enum strings, (c) derived language schema is registered and constrains value to 36 enum strings, (d) theme and language are schemas (type IDs ending with `~`), not instances.
- [x] 8.2 Add validation tests in the GTS plugin test file: construct a named GTS instance `{ id: "${themeTypeId}hai3.mfes.comm.runtime.v1", value: "dark" }`, register and validate — passes. Construct with `value: "neon"`, register and validate — fails. Verify schema is extracted from the chained ID (no `type` field used).

## 9. Build Verification

- [x] 9.1 Run `npm run build --workspace=@hai3/screensets` — verify no TypeScript errors from schema/type changes.
- [x] 9.2 Run `npm run build --workspace=@hai3/framework` — verify no errors from constant value changes.
- [x] 9.3 Run `cd packages/screensets && npx vitest run` — all screensets tests pass.
- [x] 9.4 Run `cd packages/framework && npx vitest run` — all framework tests pass (including theme-language-propagation tests).
- [x] 9.5 Run `cd packages/react && npx vitest run` — all react tests pass (including useSharedProperty hook tests).
