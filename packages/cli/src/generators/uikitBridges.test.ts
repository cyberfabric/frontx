/**
 * Unit tests for UI kit bridge utilities
 *
 */

import { describe, expect, it } from 'vitest';
import {
  getUikitBridge,
  generateGenericThemes,
  generateGenericGlobalsCss,
} from './uikitBridges.js';

function getKnownBridge() {
  const bridge = getUikitBridge('@acronis-platform/shadcn-uikit');
  expect(bridge).not.toBe(null);
  if (bridge === null) {
    throw new Error('expected known UI kit bridge');
  }
  return bridge;
}

describe('getUikitBridge', () => {
  it('should return a bridge for @acronis-platform/shadcn-uikit', () => {
    const bridge = getKnownBridge();
    expect(bridge.type).toBe('css-alias');
  });

  it('should include CSS imports for known bridge', () => {
    const bridge = getKnownBridge();
    if (bridge.type !== 'css-alias') {
      throw new Error('expected css-alias bridge');
    }
    expect(bridge.cssImports.length > 0).toBeTruthy();
    expect(bridge.bridgeCss).toContain(':root');
  });

  it('should include theme mappings for known bridge', () => {
    const bridge = getKnownBridge();
    if (bridge.type !== 'css-alias') {
      throw new Error('expected css-alias bridge');
    }
    expect(bridge.themes.length > 0).toBeTruthy();
    const defaultTheme = bridge.themes.find((t) => t.default === true);
    expect(defaultTheme).toBeTruthy();
  });

  it('should include sync import and effect for known bridge', () => {
    const bridge = getKnownBridge();
    expect(bridge.syncImport.length > 0).toBeTruthy();
    expect(bridge.syncEffect.length > 0).toBeTruthy();
  });

  it('should include dependencies for known bridge', () => {
    const bridge = getKnownBridge();
    expect(Object.keys(bridge.dependencies).length > 0).toBeTruthy();
    expect('@acronis-platform/shadcn-uikit' in bridge.dependencies).toBeTruthy();
  });

  it('should return null for unknown packages', () => {
    expect(getUikitBridge('antd')).toBe(null);
    expect(getUikitBridge('@mui/material')).toBe(null);
    expect(getUikitBridge('nonexistent-package')).toBe(null);
  });
});

describe('generateGenericThemes', () => {
  it('should return two themes (default and dark)', () => {
    const { themes } = generateGenericThemes();
    expect(themes.length).toBe(2);
  });

  it('should set defaultId to "default"', () => {
    const { defaultId } = generateGenericThemes();
    expect(defaultId).toBe('default');
  });

  it('should mark the first theme as default', () => {
    const { themes } = generateGenericThemes();
    expect(themes[0].default).toBe(true);
    expect(themes[0].id).toBe('default');
    expect(themes[0].name).toBe('Default');
  });

  it('should have a dark theme without default flag', () => {
    const { themes } = generateGenericThemes();
    expect(themes[1].id).toBe('dark');
    expect(themes[1].name).toBe('Dark');
    expect(themes[1].default).toBe(undefined);
  });

  it('should include essential CSS variables in both themes', () => {
    const { themes } = generateGenericThemes();
    const requiredVars = [
      '--background', '--foreground', '--primary', '--primary-foreground',
      '--secondary', '--border', '--radius-sm', '--radius-lg',
    ];

    for (const theme of themes) {
      for (const varName of requiredVars) {
        expect(varName in theme.variables, `Theme "${theme.id}" is missing variable "${varName}"`).toBeTruthy();
      }
    }
  });

  it('should have light background in default theme and dark in dark theme', () => {
    const { themes } = generateGenericThemes();
    expect(themes[0].variables['--background']).toContain('100%');
    expect(themes[1].variables['--background']).toContain('3.9%');
    expect(themes[0].variables['--background']).not.toContain('hsl(');
    expect(themes[1].variables['--background']).not.toContain('hsl(');
  });
});

describe('generateGenericGlobalsCss', () => {
  it('should include :root block with CSS variables', () => {
    const css = generateGenericGlobalsCss();
    expect(css).toContain(':root {');
    expect(css).toContain('--background:');
    expect(css).toContain('--foreground:');
    expect(css).toContain('--primary:');
  });

  it('should include body styling', () => {
    const css = generateGenericGlobalsCss();
    expect(css).toContain('body {');
    expect(css).toContain('background-color: hsl(var(--background))');
    expect(css).toContain('color: hsl(var(--foreground))');
  });

  it('should include html,body reset', () => {
    const css = generateGenericGlobalsCss();
    expect(css).toContain('html, body {');
    expect(css).toContain('margin: 0');
  });

  it('should include font-family declaration', () => {
    const css = generateGenericGlobalsCss();
    expect(css).toContain('font-family:');
  });
});
