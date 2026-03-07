## Context

The `microfrontends()` plugin currently owns three concerns that don't belong to it:

1. **Theme propagation** — `onInit` subscribes to `theme/changed` and pushes to all 4 domain IDs.
2. **Language propagation** — `onInit` subscribes to `i18n/language/changed` and pushes to all 4 domain IDs.

The themes plugin (`themes.ts`) and i18n plugin (`i18n.ts`) already subscribe to their respective events in `onInit` but only to update their own registries. They don't touch domain properties because the microfrontends plugin took that responsibility.

The `ScreensetsRegistry` currently has `updateDomainProperty(domainId, propertyTypeId, value)` and `updateDomainProperties(domainId, properties)` which update a single domain's properties. It also has `getDomainProperty(domainId, propertyTypeId)` for querying. But there's no way to broadcast a property value to all domains that declare interest in it — callers must know which domains exist. The per-domain write model also implies properties could have different values per domain, which doesn't match the shared property semantics (theme is "dark" globally, not per-domain).

## Goals / Non-Goals

**Goals:**

- Move shared property propagation to owning plugins (themes, i18n) so each plugin owns the full lifecycle of its data
- Replace `updateDomainProperty()`/`updateDomainProperties()` with `updateSharedProperty()` on `ScreensetsRegistry` — a single global write method so property producers don't need to know which domains exist
- Keep `createHAI3App()` usable without MFE config

**Non-Goals:**

- Changing infrastructure action handling (load/mount/unmount) — already generic in L1
- Changing the `ExtensionDomain` interface — it's already fully generic
- Changing contract validation — `validateContract()` is already generic
- Adding a domain registry or domain discovery service — domains are still registered via `registerDomain()` at runtime
- Changing how `customActionHandler` works — already wired per-domain at `registerDomain()` time
- Automatic shared property propagation for nested MFEs — deferred to a follow-up change (see Future Work in proposal)

## Decisions

### Decision 1: `updateSharedProperty()` replaces `updateDomainProperty()`/`updateDomainProperties()` on ScreensetsRegistry (L1)

**Choice:** Replace the existing per-domain write methods (`updateDomainProperty`, `updateDomainProperties`) with a single `updateSharedProperty(propertyId: string, value: unknown): void` abstract method on `ScreensetsRegistry`. `getDomainProperty()` remains as the read path.

**Rationale — global, not per-domain:** Shared properties have global values. Theme is "dark" for the whole app, not "dark" in screen domain and "light" in sidebar domain. Having both `updateDomainProperty` (per-domain values) and `updateSharedProperty` (global values) simultaneously implies two conflicting models. We choose the global model because it matches reality and is simpler.

**Implementation:** The `DefaultScreensetsRegistry` implementation iterates all registered domains, checks if `domain.sharedProperties.includes(propertyId)`, and for each matching domain: constructs a GTS ephemeral instance ID, registers it via `typeSystem.register()`, validates via `typeSystem.validateInstance()`, and stores/propagates the value to subscribers.

**Why on the abstract class:** This is a public API that plugins call. It belongs on the abstraction, not as a utility function.

**Why it iterates registered domains (not config domains):** A domain must be registered (via `registerDomain()`) before it can receive property updates. Iterating registered domains means:
- Late-registered domains automatically participate in future broadcasts
- Unregistered domains don't receive updates
- No dependency on config — works with any domain registered from any source

**Validation:** `updateSharedProperty` performs GTS validation using the existing `TypeSystemPlugin.register()` + `TypeSystemPlugin.validateInstance()` pattern — the same mechanism used by actions chains. Since the GTS schema is derived from the property type ID (not the domain), validation MAY be performed once per `updateSharedProperty` call rather than per matching domain. Validation MUST complete before propagation begins.

**Alternatives considered:**
- Keep both `updateDomainProperty` and `updateSharedProperty` — Implies two conflicting value models (per-domain vs global). Rejected to avoid API surface ambiguity.
- Utility function outside the registry — Breaks encapsulation. The registry owns domain state and property subscriptions.
- Event-based broadcast — Over-engineered. Direct method call is simpler and synchronous.

### Decision 2: Move theme propagation to `themes()` plugin

**Choice:** In `themes.ts` `onInit`, after applying the theme to the registry, also broadcast to MFE domains:

```typescript
onInit(app) {
  eventBus.on('theme/changed', (payload) => {
    themeRegistry.apply(payload.themeId);
    try {
      app.screensetsRegistry?.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, payload.themeId);
    } catch (error) {
      logger.error('Failed to propagate theme to MFE domains', error);
    }
  });
}
```

**Error handling:** The `updateSharedProperty` call is wrapped in try/catch because validation failures (e.g., a custom theme value that fails GTS schema validation) must not crash the event handler or prevent the theme registry from applying the theme. The pattern matches the existing microfrontends code, which uses try/catch around property propagation. On failure, the error is logged and the plugin continues operating normally — the theme is applied to the theme registry even if MFE propagation fails.

**Dependency:** The themes plugin gains a soft dependency on `screensetsRegistry` being available on the app. If microfrontends plugin is not used (e.g., `minimal` preset), `app.screensetsRegistry` may be undefined. The plugin must guard: `app.screensetsRegistry?.updateSharedProperty(...)`.

**Why not a hard dependency:** Themes should work without MFEs. A minimal app with just themes and screensets shouldn't require the microfrontends plugin.

### Decision 3: Move language propagation to `i18n()` plugin

**Choice:** Same pattern as themes. In `i18n.ts` `onInit`:

```typescript
onInit(app) {
  eventBus.on('i18n/language/changed', async (payload) => {
    await i18nRegistry.setLanguage(payload.language);
    try {
      app.screensetsRegistry?.updateSharedProperty(HAI3_SHARED_PROPERTY_LANGUAGE, payload.language);
    } catch (error) {
      logger.error('Failed to propagate language to MFE domains', error);
    }
  });
}
```

Same error handling and soft dependency guard as themes. The `i18nRegistry.setLanguage()` completes before the propagation attempt, so a GTS validation failure in `updateSharedProperty` does not affect the i18n registry's own language state.

### Decision 4: Full preset passes config through without defaults

**Choice:** The `full()` preset forwards `config?.microfrontends` directly to `microfrontends()` without injecting domain defaults:

```typescript
export function full(config?: FullPresetConfig): HAI3Plugin[] {
  return [
    // ...
    microfrontends(config?.microfrontends),
  ];
}
```

No implicit injection. `createHAI3App()` with zero args builds a valid app with no pre-declared domains.

### Decision 5: Shared property constants remain as vocabulary

**Choice:** `HAI3_SHARED_PROPERTY_THEME` and `HAI3_SHARED_PROPERTY_LANGUAGE` stay in `@hai3/screensets/constants` and continue to be re-exported through the chain (screensets → framework → react).

**Why keep them:** They're used by:
- Domain definitions (in `sharedProperties` arrays)
- Plugins (for `updateSharedProperty` calls)
- MFEs (for `bridge.subscribeToProperty()` calls)

They're vocabulary — identifiers for a communication channel. They stop implying automatic behavior because the propagation moves to owning plugins.

### Decision 6: Remove propagation from `microfrontends()` onInit

**Choice:** Delete the `eventBus.on('theme/changed', ...)` and `eventBus.on('i18n/language/changed', ...)` listeners from `microfrontends/index.ts` `onInit`. Remove the `propagationCleanup` closure and its call in `onDestroy`.

The plugin's `onInit` retains only:
- `setMfeRegistry(screensetsRegistry)` — wiring actions module
- `initMfeEffects(screensetsRegistry)` — MFE-specific effects

### Decision 7: Manual bridge forwarding for nested MFE hosts

**Choice:** MFEs that act as nested hosts (creating their own child registry with domains) must manually forward shared properties from the parent bridge to their child registry:

```typescript
// Inside nested MFE's mount()
async mount(container, bridge) {
  const registry = screensetsRegistryFactory.build({ typeSystem: gtsPlugin });
  registry.registerDomain(chartDomain, provider);

  // Manual forwarding — one line per shared property
  bridge.subscribeToProperty(HAI3_SHARED_PROPERTY_THEME, (value) => {
    registry.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, value.value);
  });
  bridge.subscribeToProperty(HAI3_SHARED_PROPERTY_LANGUAGE, (value) => {
    registry.updateSharedProperty(HAI3_SHARED_PROPERTY_LANGUAGE, value.value);
  });
}
```

**Why manual (for now):** Automatic propagation requires redesigning the MFE entry contract — introducing a `serve()` method on `ScreensetsRegistryFactory`, a `ServedMfeEntry` abstract class, and an internal `ChildScreensetsRegistryFactory` with `buildChild(config, bridge)`. This is a significant change with its own design decisions (compile-time enforcement via abstract classes, `instanceof` across blob URL boundaries, factory cache pre-population timing). It deserves a dedicated follow-up change rather than being mixed into this one.

**Why `updateSharedProperty` still helps:** Without it, the forwarding would require iterating domain IDs manually. With it, the MFE just broadcasts and the registry matches to declaring domains — same one-liner regardless of how many child domains exist.

**Future:** A follow-up change will automate this via the `serve()` pattern described in the proposal's Future Work section.

## Risks / Trade-offs

**[Plugin ordering]** → Themes/i18n plugins call `app.screensetsRegistry?.updateSharedProperty()`. If `screensetsRegistry` isn't built yet (microfrontends plugin hasn't initialized), the optional chaining silently skips. This is acceptable because: (a) the initial theme/language bootstrap happens in `onInit` which runs after all plugins are built, and (b) the `full()` preset includes microfrontends. Mitigated by the `?.` guard.

**[Breaking change for direct microfrontends() users]** → Projects that call `microfrontends()` directly (not via preset) and relied on automatic theme/language propagation will lose that behavior. They must either use the full preset or add their own propagation. Mitigated by documentation.

**[Test impact]** → Framework tests that verify theme/language propagation through the microfrontends plugin will need to be restructured to test through themes/i18n plugins instead. This is a test-only concern, not a runtime risk.
