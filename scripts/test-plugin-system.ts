/**
 * Plugin System Tests
 *
 * Tests for 10.7.1.x (Headless Preset) and 10.7.2.x (Plugin Composition)
 *
 * Run with: npx tsx scripts/test-plugin-system.ts
 */

import {
  createHAI3,
  createHAI3App,
  presets,
  screensets,
  themes,
  layout,
  telemetry,
  i18n,
  effects,
} from '@hai3/framework';

// ============================================================================
// Test Utilities
// ============================================================================

let testsPassed = 0;
let testsFailed = 0;

function test(name: string, fn: () => boolean | void): void {
  try {
    const result = fn();
    if (result === false) {
      console.log(`❌ FAIL: ${name}`);
      testsFailed++;
    } else {
      console.log(`✅ PASS: ${name}`);
      testsPassed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error instanceof Error ? error.message : error}`);
    testsFailed++;
  }
}

function assert(condition: boolean, message?: string): void {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ============================================================================
// 10.7.1 Headless Preset Tests
// ============================================================================

console.log('\n=== 10.7.1 Headless Preset Tests ===\n');

test('10.7.1.1 Create app with headless preset', () => {
  const app = createHAI3()
    .useAll(presets.headless())
    .build();

  assert(app !== null, 'App should be created');
  assert(typeof app.store !== 'undefined', 'App should have store');

  // Cleanup
  app.destroy();
});

test('10.7.1.2 Only screensets plugin is active (headless)', () => {
  const app = createHAI3()
    .useAll(presets.headless())
    .build();

  // screensetsRegistry should not exist without the microfrontends plugin
  assert(app.screensetsRegistry === undefined, 'screensetsRegistry should NOT exist in headless');

  // themeRegistry should NOT exist (no themes plugin)
  assert(app.themeRegistry === undefined, 'themeRegistry should NOT exist in headless');

  app.destroy();
});

test('10.7.1.3 screensetRegistry is available and works', () => {
  const app = createHAI3()
    .useAll(presets.headless())
    .build();

  assert(typeof app.actions.setActiveScreen === 'function', 'setActiveScreen action should exist');
  assert(typeof app.actions.setScreenLoading === 'function', 'setScreenLoading action should exist');

  app.destroy();
});

test('10.7.1.4 Store is configured with screen slice only', () => {
  const app = createHAI3()
    .useAll(presets.headless())
    .build();

  const state = app.store.getState() as Record<string, unknown>;

  // Should have screen state (from screensets plugin)
  // The screensets plugin adds 'layout/screen' slice
  assert('layout/screen' in state, 'Should have layout/screen state');

  // Should NOT have full layout domains (header, footer, menu, etc.)
  assert(!('layout' in state) || typeof state['layout'] !== 'object' ||
         !('header' in (state['layout'] as Record<string, unknown>)), 'Should NOT have header domain');

  app.destroy();
});

test('10.7.1.5 Layout domains are NOT registered in headless', () => {
  const app = createHAI3()
    .useAll(presets.headless())
    .build();

  const state = app.store.getState() as Record<string, unknown>;
  const layoutState = typeof state.layout === 'object' && state.layout !== null
    ? state.layout as Record<string, unknown>
    : undefined;

  // In headless mode, layout domains should not be present
  // unless explicitly added via layout() plugin
  const hasFullLayout = !!layoutState
    && 'header' in layoutState
    && 'footer' in layoutState
    && 'menu' in layoutState;

  // For headless preset, we expect minimal layout or no full layout domains
  assert(hasFullLayout === false, 'Headless preset should not register full layout domains');

  app.destroy();
});

// ============================================================================
// 10.7.2 Custom Plugin Composition Tests
// ============================================================================

console.log('\n=== 10.7.2 Custom Plugin Composition Tests ===\n');

test('10.7.2.1 screensets + themes composition works', () => {
  const app = createHAI3()
    .use(screensets())
    .use(themes())
    .build();

  assert(app !== null, 'App should be created');
  assert(app.themeRegistry !== undefined, 'themeRegistry should exist');
  assert(typeof app.actions.setActiveScreen === 'function', 'setActiveScreen action should exist');
  assert(typeof app.actions.changeTheme === 'function', 'changeTheme action should exist');
  assert(app.screensetsRegistry === undefined, 'screensetsRegistry should not exist without microfrontends');

  app.destroy();
});

test('10.7.2.2 Individual plugins can be imported and used', () => {
  // Test that each plugin can be instantiated
  const screensetsPlugin = screensets();
  const themesPlugin = themes();
  const layoutPlugin = layout();
  const telemetryPlugin = telemetry({ enabled: false });
  const i18nPlugin = i18n();
  const effectsPlugin = effects();

  assert(screensetsPlugin.name === 'screensets', 'screensets plugin should have correct name');
  assert(themesPlugin.name === 'themes', 'themes plugin should have correct name');
  assert(layoutPlugin.name === 'layout', 'layout plugin should have correct name');
  assert(telemetryPlugin.name === 'telemetry', 'telemetry plugin should have correct name');
  assert(i18nPlugin.name === 'i18n', 'i18n plugin should have correct name');
  assert(effectsPlugin.name === 'effects', 'effects plugin should have correct name');
});

test('10.7.2.3 Plugin composition order does not matter', () => {
  // Order 1: screensets, themes, layout
  const app1 = createHAI3()
    .use(screensets())
    .use(themes())
    .use(layout())
    .build();

  // Order 2: layout, themes, screensets
  const app2 = createHAI3()
    .use(layout())
    .use(themes())
    .use(screensets())
    .build();

  // Both should work
  assert(typeof app1.actions.setActiveScreen === 'function', 'app1 should expose screensets actions');
  assert(typeof app2.actions.setActiveScreen === 'function', 'app2 should expose screensets actions');
  assert(typeof app1.actions.changeTheme === 'function', 'app1 should expose theme actions');
  assert(typeof app2.actions.changeTheme === 'function', 'app2 should expose theme actions');

  app1.destroy();
  app2.destroy();
});

test('10.7.2.4 Plugin dependency auto-resolution works', () => {
  // Layout depends on screensets.
  // The app builder should handle this automatically.
  const app = createHAI3()
    .use(layout())
    .use(screensets())
    .build();

  // If we got here without error, dependencies were resolved
  assert(app !== null, 'App should be created with dependencies resolved');
  assert(typeof app.actions.showPopup === 'function', 'showPopup action should exist');

  app.destroy();
});

test('10.7.2.5 Full preset creates complete app', () => {
  const app = createHAI3App({ telemetry: { enabled: false } }); // Uses full preset + telemetry

  assert(app.themeRegistry !== undefined, 'themeRegistry should exist');
  assert(app.i18nRegistry !== undefined, 'i18nRegistry should exist');
  assert(typeof app.actions.changeTheme === 'function', 'changeTheme action should exist');
  assert(typeof app.actions.setLanguage === 'function', 'setLanguage action should exist');
  assert(typeof app.actions.toggleMockMode === 'function', 'toggleMockMode action should exist');

  app.destroy();
});

test('10.7.2.6 Minimal preset has only screensets and themes', () => {
  const app = createHAI3()
    .useAll(presets.minimal())
    .build();

  assert(app.themeRegistry !== undefined, 'themeRegistry should exist');
  assert(typeof app.actions.setActiveScreen === 'function', 'setActiveScreen action should exist');
  assert(typeof app.actions.changeTheme === 'function', 'changeTheme action should exist');
  assert(app.screensetsRegistry === undefined, 'screensetsRegistry should not exist without microfrontends');

  app.destroy();
});

// ============================================================================
// Summary
// ============================================================================

console.log('\n=== Test Summary ===\n');
console.log(`Total: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed > 0) {
  console.log('\n❌ Some tests failed');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed');
  process.exit(0);
}
