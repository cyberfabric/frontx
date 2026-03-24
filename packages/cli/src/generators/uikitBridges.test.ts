/**
 * Unit tests for UI kit bridge utilities
 *
 * Run with: node --import tsx --test src/generators/uikitBridges.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getUikitBridge,
  generateGenericThemes,
  generateGenericGlobalsCss,
} from './uikitBridges.js';

describe('getUikitBridge', () => {
  it('should return a bridge for @acronis-platform/shadcn-uikit', () => {
    const bridge = getUikitBridge('@acronis-platform/shadcn-uikit');
    assert.notEqual(bridge, null);
    assert.equal(bridge!.type, 'css-alias');
  });

  it('should include CSS imports for known bridge', () => {
    const bridge = getUikitBridge('@acronis-platform/shadcn-uikit');
    assert.equal(bridge!.type, 'css-alias');
    if (bridge != null && bridge.type === 'css-alias') {
      assert.ok(bridge.cssImports.length > 0);
      assert.ok(bridge.bridgeCss.includes(':root'));
    }
  });

  it('should include theme mappings for known bridge', () => {
    const bridge = getUikitBridge('@acronis-platform/shadcn-uikit');
    if (bridge != null && bridge.type === 'css-alias') {
      assert.ok(bridge.themes.length > 0);
      const defaultTheme = bridge.themes.find((t) => t.default === true);
      assert.ok(defaultTheme, 'Should have a default theme');
    }
  });

  it('should include sync import and effect for known bridge', () => {
    const bridge = getUikitBridge('@acronis-platform/shadcn-uikit');
    assert.ok(bridge!.syncImport.length > 0);
    assert.ok(bridge!.syncEffect.length > 0);
  });

  it('should include dependencies for known bridge', () => {
    const bridge = getUikitBridge('@acronis-platform/shadcn-uikit');
    assert.ok(Object.keys(bridge!.dependencies).length > 0);
    assert.ok('@acronis-platform/shadcn-uikit' in bridge!.dependencies);
  });

  it('should return null for unknown packages', () => {
    assert.equal(getUikitBridge('antd'), null);
    assert.equal(getUikitBridge('@mui/material'), null);
    assert.equal(getUikitBridge('nonexistent-package'), null);
  });
});

describe('generateGenericThemes', () => {
  it('should return two themes (default and dark)', () => {
    const { themes } = generateGenericThemes();
    assert.equal(themes.length, 2);
  });

  it('should set defaultId to "default"', () => {
    const { defaultId } = generateGenericThemes();
    assert.equal(defaultId, 'default');
  });

  it('should mark the first theme as default', () => {
    const { themes } = generateGenericThemes();
    assert.equal(themes[0].default, true);
    assert.equal(themes[0].id, 'default');
    assert.equal(themes[0].name, 'Default');
  });

  it('should have a dark theme without default flag', () => {
    const { themes } = generateGenericThemes();
    assert.equal(themes[1].id, 'dark');
    assert.equal(themes[1].name, 'Dark');
    assert.equal(themes[1].default, undefined);
  });

  it('should include essential CSS variables in both themes', () => {
    const { themes } = generateGenericThemes();
    const requiredVars = [
      '--background', '--foreground', '--primary', '--primary-foreground',
      '--secondary', '--border', '--radius-sm', '--radius-lg',
    ];

    for (const theme of themes) {
      for (const varName of requiredVars) {
        assert.ok(varName in theme.variables, `Theme "${theme.id}" is missing variable "${varName}"`);
      }
    }
  });

  it('should have light background in default theme and dark in dark theme', () => {
    const { themes } = generateGenericThemes();
    assert.ok(themes[0].variables['--background'].includes('100%'));
    assert.ok(themes[1].variables['--background'].includes('3.9%'));
    assert.ok(!themes[0].variables['--background'].includes('hsl('));
    assert.ok(!themes[1].variables['--background'].includes('hsl('));
  });
});

describe('generateGenericGlobalsCss', () => {
  it('should include :root block with CSS variables', () => {
    const css = generateGenericGlobalsCss();
    assert.ok(css.includes(':root {'));
    assert.ok(css.includes('--background:'));
    assert.ok(css.includes('--foreground:'));
    assert.ok(css.includes('--primary:'));
  });

  it('should include body styling', () => {
    const css = generateGenericGlobalsCss();
    assert.ok(css.includes('body {'));
    assert.ok(css.includes('background-color: hsl(var(--background))'));
    assert.ok(css.includes('color: hsl(var(--foreground))'));
  });

  it('should include html,body reset', () => {
    const css = generateGenericGlobalsCss();
    assert.ok(css.includes('html, body {'));
    assert.ok(css.includes('margin: 0'));
  });

  it('should include font-family declaration', () => {
    const css = generateGenericGlobalsCss();
    assert.ok(css.includes('font-family:'));
  });
});
