/**
 * Unit tests for layer-aware filtering utilities
 *
 * Run with: node --import tsx --test src/core/layers.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { selectCommandVariant, isTargetApplicableToLayer, type LayerType } from './layers.js';

describe('selectCommandVariant', () => {
  describe('SDK layer', () => {
    it('should select .sdk.md variant when available', () => {
      const result = selectCommandVariant(
        'hai3-validate.md',
        'sdk',
        ['hai3-validate.md', 'hai3-validate.sdk.md', 'hai3-validate.framework.md']
      );
      assert.equal(result, 'hai3-validate.sdk.md');
    });

    it('should fall back to .md when no .sdk.md', () => {
      const result = selectCommandVariant(
        'hai3-validate.md',
        'sdk',
        ['hai3-validate.md', 'hai3-validate.framework.md']
      );
      assert.equal(result, 'hai3-validate.md');
    });

    it('should return null when no matching variant found', () => {
      const result = selectCommandVariant(
        'hai3-validate.md',
        'sdk',
        ['hai3-validate.react.md', 'hai3-validate.framework.md']
      );
      assert.equal(result, null);
    });
  });

  describe('Framework layer', () => {
    it('should select .framework.md when available', () => {
      const result = selectCommandVariant(
        'hai3-validate.md',
        'framework',
        ['hai3-validate.md', 'hai3-validate.sdk.md', 'hai3-validate.framework.md']
      );
      assert.equal(result, 'hai3-validate.framework.md');
    });

    it('should fall back through chain: .framework.md → .sdk.md → .md', () => {
      // No .framework.md, should find .sdk.md
      let result = selectCommandVariant(
        'hai3-validate.md',
        'framework',
        ['hai3-validate.md', 'hai3-validate.sdk.md']
      );
      assert.equal(result, 'hai3-validate.sdk.md');

      // No .framework.md or .sdk.md, should find .md
      result = selectCommandVariant(
        'hai3-validate.md',
        'framework',
        ['hai3-validate.md']
      );
      assert.equal(result, 'hai3-validate.md');
    });

    it('should return null when no matching variant in chain', () => {
      const result = selectCommandVariant(
        'hai3-validate.md',
        'framework',
        ['hai3-validate.react.md']
      );
      assert.equal(result, null);
    });
  });

  describe('React layer', () => {
    it('should select .react.md when available', () => {
      const result = selectCommandVariant(
        'hai3-validate.md',
        'react',
        ['hai3-validate.md', 'hai3-validate.sdk.md', 'hai3-validate.framework.md', 'hai3-validate.react.md']
      );
      assert.equal(result, 'hai3-validate.react.md');
    });

    it('should fall back through full chain: .react.md → .framework.md → .sdk.md → .md', () => {
      // No .react.md, should find .framework.md
      let result = selectCommandVariant(
        'hai3-validate.md',
        'react',
        ['hai3-validate.md', 'hai3-validate.sdk.md', 'hai3-validate.framework.md']
      );
      assert.equal(result, 'hai3-validate.framework.md');

      // No .react.md or .framework.md, should find .sdk.md
      result = selectCommandVariant(
        'hai3-validate.md',
        'react',
        ['hai3-validate.md', 'hai3-validate.sdk.md']
      );
      assert.equal(result, 'hai3-validate.sdk.md');

      // No .react.md, .framework.md or .sdk.md, should find .md
      result = selectCommandVariant(
        'hai3-validate.md',
        'react',
        ['hai3-validate.md']
      );
      assert.equal(result, 'hai3-validate.md');
    });

    it('should return null when no matching variant in chain', () => {
      const result = selectCommandVariant(
        'hai3-validate.md',
        'react',
        ['hai3-other.md']
      );
      assert.equal(result, null);
    });
  });

  describe('App layer', () => {
    it('should behave same as React layer', () => {
      const availableFiles = ['hai3-validate.md', 'hai3-validate.sdk.md', 'hai3-validate.framework.md', 'hai3-validate.react.md'];

      // Both should select .react.md when available
      const reactResult = selectCommandVariant('hai3-validate.md', 'react', availableFiles);
      const appResult = selectCommandVariant('hai3-validate.md', 'app', availableFiles);
      assert.equal(reactResult, appResult);
      assert.equal(appResult, 'hai3-validate.react.md');
    });

    it('should fall back through same chain as React layer', () => {
      // Test fallback without .react.md
      const filesWithoutReact = ['hai3-validate.md', 'hai3-validate.sdk.md', 'hai3-validate.framework.md'];
      const reactResult = selectCommandVariant('hai3-validate.md', 'react', filesWithoutReact);
      const appResult = selectCommandVariant('hai3-validate.md', 'app', filesWithoutReact);
      assert.equal(reactResult, appResult);
      assert.equal(appResult, 'hai3-validate.framework.md');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty available files array', () => {
      const result = selectCommandVariant('hai3-validate.md', 'sdk', []);
      assert.equal(result, null);
    });

    it('should handle command name without .md extension in available files', () => {
      // selectCommandVariant expects baseName WITH .md, but available files might vary
      const result = selectCommandVariant(
        'hai3-validate.md',
        'sdk',
        ['hai3-validate.sdk.md']
      );
      assert.equal(result, 'hai3-validate.sdk.md');
    });
  });
});

describe('isTargetApplicableToLayer', () => {
  describe('SDK targets', () => {
    const sdkTargets = ['API.md', 'STORE.md', 'EVENTS.md', 'I18N.md'];
    const allLayers: LayerType[] = ['sdk', 'framework', 'react', 'app'];

    sdkTargets.forEach(target => {
      it(`${target} should be available to all layers`, () => {
        allLayers.forEach(layer => {
          assert.equal(
            isTargetApplicableToLayer(target, layer),
            true,
            `${target} should be available to ${layer} layer`
          );
        });
      });
    });
  });

  describe('Framework targets', () => {
    const frameworkTargets = ['FRAMEWORK.md', 'LAYOUT.md', 'THEMES.md'];

    frameworkTargets.forEach(target => {
      it(`${target} should be available to framework, react, app (not sdk)`, () => {
        assert.equal(isTargetApplicableToLayer(target, 'sdk'), false);
        assert.equal(isTargetApplicableToLayer(target, 'framework'), true);
        assert.equal(isTargetApplicableToLayer(target, 'react'), true);
        assert.equal(isTargetApplicableToLayer(target, 'app'), true);
      });
    });
  });

  describe('React targets', () => {
    const reactTargets = ['REACT.md', 'SCREENSETS.md', 'STYLING.md', 'UIKIT.md', 'STUDIO.md'];

    reactTargets.forEach(target => {
      it(`${target} should be available to react, app only`, () => {
        assert.equal(isTargetApplicableToLayer(target, 'sdk'), false);
        assert.equal(isTargetApplicableToLayer(target, 'framework'), false);
        assert.equal(isTargetApplicableToLayer(target, 'react'), true);
        assert.equal(isTargetApplicableToLayer(target, 'app'), true);
      });
    });
  });

  describe('Meta/tooling targets', () => {
    const metaTargets = ['AI.md', 'AI_COMMANDS.md', 'CLI.md'];
    const allLayers: LayerType[] = ['sdk', 'framework', 'react', 'app'];

    metaTargets.forEach(target => {
      it(`${target} should be available to all layers`, () => {
        allLayers.forEach(layer => {
          assert.equal(
            isTargetApplicableToLayer(target, layer),
            true,
            `${target} should be available to ${layer} layer`
          );
        });
      });
    });
  });

  describe('Unknown targets', () => {
    it('should return true for backward compatibility', () => {
      const allLayers: LayerType[] = ['sdk', 'framework', 'react', 'app'];

      allLayers.forEach(layer => {
        assert.equal(
          isTargetApplicableToLayer('UNKNOWN.md', layer),
          true,
          `Unknown target should be available to ${layer} layer for backward compatibility`
        );
      });
    });
  });
});
