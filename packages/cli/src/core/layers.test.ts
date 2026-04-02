/**
 * Unit tests for layer-aware filtering utilities
 *
 */

import { describe, expect, it } from 'vitest';
import { selectCommandVariant, isTargetApplicableToLayer, type LayerType } from './layers.js';

describe('selectCommandVariant', () => {
  describe('SDK layer', () => {
    it('should select .sdk.md variant when available', () => {
      const result = selectCommandVariant(
        'frontx-validate.md',
        'sdk',
        ['frontx-validate.md', 'frontx-validate.sdk.md', 'frontx-validate.framework.md']
      );
      expect(result).toBe('frontx-validate.sdk.md');
    });

    it('should fall back to .md when no .sdk.md', () => {
      const result = selectCommandVariant(
        'frontx-validate.md',
        'sdk',
        ['frontx-validate.md', 'frontx-validate.framework.md']
      );
      expect(result).toBe('frontx-validate.md');
    });

    it('should return null when no matching variant found', () => {
      const result = selectCommandVariant(
        'frontx-validate.md',
        'sdk',
        ['frontx-validate.react.md', 'frontx-validate.framework.md']
      );
      expect(result).toBe(null);
    });
  });

  describe('Framework layer', () => {
    it('should select .framework.md when available', () => {
      const result = selectCommandVariant(
        'frontx-validate.md',
        'framework',
        ['frontx-validate.md', 'frontx-validate.sdk.md', 'frontx-validate.framework.md']
      );
      expect(result).toBe('frontx-validate.framework.md');
    });

    it('should fall back through chain: .framework.md → .sdk.md → .md', () => {
      // No .framework.md, should find .sdk.md
      let result = selectCommandVariant(
        'frontx-validate.md',
        'framework',
        ['frontx-validate.md', 'frontx-validate.sdk.md']
      );
      expect(result).toBe('frontx-validate.sdk.md');

      // No .framework.md or .sdk.md, should find .md
      result = selectCommandVariant(
        'frontx-validate.md',
        'framework',
        ['frontx-validate.md']
      );
      expect(result).toBe('frontx-validate.md');
    });

    it('should return null when no matching variant in chain', () => {
      const result = selectCommandVariant(
        'frontx-validate.md',
        'framework',
        ['frontx-validate.react.md']
      );
      expect(result).toBe(null);
    });
  });

  describe('React layer', () => {
    it('should select .react.md when available', () => {
      const result = selectCommandVariant(
        'frontx-validate.md',
        'react',
        ['frontx-validate.md', 'frontx-validate.sdk.md', 'frontx-validate.framework.md', 'frontx-validate.react.md']
      );
      expect(result).toBe('frontx-validate.react.md');
    });

    it('should fall back through full chain: .react.md → .framework.md → .sdk.md → .md', () => {
      // No .react.md, should find .framework.md
      let result = selectCommandVariant(
        'frontx-validate.md',
        'react',
        ['frontx-validate.md', 'frontx-validate.sdk.md', 'frontx-validate.framework.md']
      );
      expect(result).toBe('frontx-validate.framework.md');

      // No .react.md or .framework.md, should find .sdk.md
      result = selectCommandVariant(
        'frontx-validate.md',
        'react',
        ['frontx-validate.md', 'frontx-validate.sdk.md']
      );
      expect(result).toBe('frontx-validate.sdk.md');

      // No .react.md, .framework.md or .sdk.md, should find .md
      result = selectCommandVariant(
        'frontx-validate.md',
        'react',
        ['frontx-validate.md']
      );
      expect(result).toBe('frontx-validate.md');
    });

    it('should return null when no matching variant in chain', () => {
      const result = selectCommandVariant(
        'frontx-validate.md',
        'react',
        ['frontx-other.md']
      );
      expect(result).toBe(null);
    });
  });

  describe('App layer', () => {
    it('should behave same as React layer', () => {
      const availableFiles = ['frontx-validate.md', 'frontx-validate.sdk.md', 'frontx-validate.framework.md', 'frontx-validate.react.md'];

      // Both should select .react.md when available
      const reactResult = selectCommandVariant('frontx-validate.md', 'react', availableFiles);
      const appResult = selectCommandVariant('frontx-validate.md', 'app', availableFiles);
      expect(reactResult).toBe(appResult);
      expect(appResult).toBe('frontx-validate.react.md');
    });

    it('should fall back through same chain as React layer', () => {
      // Test fallback without .react.md
      const filesWithoutReact = ['frontx-validate.md', 'frontx-validate.sdk.md', 'frontx-validate.framework.md'];
      const reactResult = selectCommandVariant('frontx-validate.md', 'react', filesWithoutReact);
      const appResult = selectCommandVariant('frontx-validate.md', 'app', filesWithoutReact);
      expect(reactResult).toBe(appResult);
      expect(appResult).toBe('frontx-validate.framework.md');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty available files array', () => {
      const result = selectCommandVariant('frontx-validate.md', 'sdk', []);
      expect(result).toBe(null);
    });

    it('should handle command name without .md extension in available files', () => {
      // selectCommandVariant expects baseName WITH .md, but available files might vary
      const result = selectCommandVariant(
        'frontx-validate.md',
        'sdk',
        ['frontx-validate.sdk.md']
      );
      expect(result).toBe('frontx-validate.sdk.md');
    });
  });
});

describe('isTargetApplicableToLayer', () => {
  describe('SDK targets', () => {
    const sdkTargets = ['API.md', 'STORE.md', 'EVENTS.md', 'I18N.md'];
    const allLayers: LayerType[] = ['sdk', 'framework', 'react', 'app'];

    it.each(sdkTargets.flatMap((target) => allLayers.map((layer) => [target, layer] as const)))(
      '%s should be available to %s layer',
      (target, layer) => {
        expect(
          isTargetApplicableToLayer(target, layer),
          `${target} should be available to ${layer} layer`
        ).toBe(true);
      }
    );
  });

  describe('Framework targets', () => {
    const frameworkTargets = ['FRAMEWORK.md', 'LAYOUT.md', 'THEMES.md'];

    frameworkTargets.forEach(target => {
      it(`${target} should be available to framework, react, app (not sdk)`, () => {
        expect(isTargetApplicableToLayer(target, 'sdk')).toBe(false);
        expect(isTargetApplicableToLayer(target, 'framework')).toBe(true);
        expect(isTargetApplicableToLayer(target, 'react')).toBe(true);
        expect(isTargetApplicableToLayer(target, 'app')).toBe(true);
      });
    });
  });

  describe('React targets', () => {
    const reactTargets = ['REACT.md', 'SCREENSETS.md', 'STYLING.md', 'UIKIT.md', 'STUDIO.md'];

    reactTargets.forEach(target => {
      it(`${target} should be available to react, app only`, () => {
        expect(isTargetApplicableToLayer(target, 'sdk')).toBe(false);
        expect(isTargetApplicableToLayer(target, 'framework')).toBe(false);
        expect(isTargetApplicableToLayer(target, 'react')).toBe(true);
        expect(isTargetApplicableToLayer(target, 'app')).toBe(true);
      });
    });
  });

  describe('Meta/tooling targets', () => {
    const metaTargets = ['AI.md', 'AI_COMMANDS.md', 'CLI.md'];
    const allLayers: LayerType[] = ['sdk', 'framework', 'react', 'app'];

    it.each(metaTargets.flatMap((target) => allLayers.map((layer) => [target, layer] as const)))(
      '%s should be available to %s layer',
      (target, layer) => {
        expect(
          isTargetApplicableToLayer(target, layer),
          `${target} should be available to ${layer} layer`
        ).toBe(true);
      }
    );
  });

  describe('Unknown targets', () => {
    const allLayers: LayerType[] = ['sdk', 'framework', 'react', 'app'];

    it.each(allLayers)(
      'UNKNOWN.md should be available to %s layer for backward compatibility',
      (layer) => {
        expect(
          isTargetApplicableToLayer('UNKNOWN.md', layer),
          `Unknown target should be available to ${layer} layer for backward compatibility`
        ).toBe(true);
      }
    );
  });
});
