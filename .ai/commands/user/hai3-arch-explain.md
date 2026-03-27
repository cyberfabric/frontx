<!-- @standalone -->
# hai3:arch-explain - Explain HAI3 Architecture Concepts

Ask the user which concept they want explained, or detect from context:

1. **Event-Driven Flow**: Action → Event → Effect → Slice pattern
2. **Registry Pattern**: Self-registration and Open/Closed principle
3. **Three-Layer Architecture**: SDK (state, screensets, api, i18n) → framework → react → app
4. **Screenset Structure**: Vertical slices with screens, state, events
5. **Dependency Rules**: Package isolation and import rules
6. **Type Safety**: Module augmentation and contract enforcement
7. **Theme System**: Theme tokens and application
8. **API Services**: Domain-based services with mocks and endpoint descriptors
9. **Endpoint Descriptors**: Cache-aware endpoints on services (`this.query()`, `this.mutation()`)
10. **queryCache Plugin**: Framework plugin that owns QueryClient lifecycle
11. **i18n System**: Namespace-based lazy loading
12. **Build Order**: Package dependency chain

Then provide:

## Concept Explanation
[Clear explanation of the concept]

## Visual Diagram
[ASCII art or flow diagram if helpful]

## Code Example
```typescript
// Show practical example
```

## Related Rules
- See `.ai/targets/{FILE}.md` for detailed rules
- See `CLAUDE.md` for architecture overview

## Common Patterns
[Show 2-3 common usage patterns]

## Anti-Patterns to Avoid
[Show what NOT to do]
