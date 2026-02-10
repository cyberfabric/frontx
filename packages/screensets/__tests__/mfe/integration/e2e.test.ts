import { describe, it, expect, beforeEach } from 'vitest';
import { createScreensetsRegistry } from '../../../src/mfe/runtime';
import { gtsPlugin } from '../../../src/mfe/plugins/gts';
import type { ScreensetsRegistry } from '../../../src/mfe/runtime';

describe('Phase 12.1: Integration Testing', () => {
  let runtime: ScreensetsRegistry;

  beforeEach(() => {
    runtime = createScreensetsRegistry({
      typeSystem: gtsPlugin,
      debug: false,
    });
  });

  describe('12.1.1: End-to-end test with mock MFE using GTS plugin', () => {
    it('should initialize runtime with GTS plugin', () => {
      // Verify runtime is created with GTS plugin
      expect(runtime).toBeDefined();
      expect(runtime.typeSystem).toBeDefined();
      expect(runtime.typeSystem.name).toBe('gts');
      expect(runtime.typeSystem.version).toBe('1.0.0');
    });

    it('should validate type IDs using GTS plugin', () => {
      // Valid GTS type IDs
      expect(runtime.typeSystem.isValidTypeId('gts.hai3.mfes.ext.domain.v1~')).toBe(true);
      expect(runtime.typeSystem.isValidTypeId('gts.hai3.mfes.mfe.entry.v1~')).toBe(true);
      expect(runtime.typeSystem.isValidTypeId('gts.hai3.mfes.ext.extension.v1~')).toBe(true);

      // Invalid type IDs
      expect(runtime.typeSystem.isValidTypeId('invalid')).toBe(false);
      expect(runtime.typeSystem.isValidTypeId('gts.too.short')).toBe(false);
      expect(runtime.typeSystem.isValidTypeId('')).toBe(false);
    });

    it('should parse type IDs correctly', () => {
      const parsed = runtime.typeSystem.parseTypeId('gts.hai3.mfes.mfe.entry.v1~');

      expect(parsed).toHaveProperty('vendor', 'hai3');
      expect(parsed).toHaveProperty('package', 'mfes');
      expect(parsed).toHaveProperty('namespace', 'mfe');
      expect(parsed).toHaveProperty('type', 'entry');
      expect(parsed).toHaveProperty('verMajor', 1);
    });
  });

  describe('12.1.2: Test full lifecycle - type system operations', () => {
    it('should check type hierarchy relationships', () => {
      // Base type matches itself
      expect(runtime.typeSystem.isTypeOf(
        'gts.hai3.mfes.mfe.entry.v1~',
        'gts.hai3.mfes.mfe.entry.v1~'
      )).toBe(true);

      // Derived type matches base
      expect(runtime.typeSystem.isTypeOf(
        'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~',
        'gts.hai3.mfes.mfe.entry.v1~'
      )).toBe(true);

      // Base type does not match derived
      expect(runtime.typeSystem.isTypeOf(
        'gts.hai3.mfes.mfe.entry.v1~',
        'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~'
      )).toBe(false);
    });

    it('should access schema information', () => {
      // First-class schemas should be available
      const entrySchema = runtime.typeSystem.getSchema('gts.hai3.mfes.mfe.entry.v1~');
      expect(entrySchema).toBeDefined();
      expect(entrySchema?.$id).toContain('gts.hai3.mfes.mfe.entry.v1~');

      const domainSchema = runtime.typeSystem.getSchema('gts.hai3.mfes.ext.domain.v1~');
      expect(domainSchema).toBeDefined();
      expect(domainSchema?.$id).toContain('gts.hai3.mfes.ext.domain.v1~');
    });
  });

  describe('12.1.3: Test multiple type system queries', () => {
    it('should query registered type IDs', () => {
      // Query for core HAI3 types
      const mfeTypes = runtime.typeSystem.query('gts.hai3.mfes.mfe.*', 10);
      expect(mfeTypes.length).toBeGreaterThan(0);

      // Query for extension types
      const extTypes = runtime.typeSystem.query('gts.hai3.mfes.ext.*', 10);
      expect(extTypes.length).toBeGreaterThan(0);

      // Query for communication types
      const commTypes = runtime.typeSystem.query('gts.hai3.mfes.comm.*', 10);
      expect(commTypes.length).toBeGreaterThan(0);
    });
  });

  describe('12.1.4: Performance testing for type system operations', () => {
    it('should perform type ID validation efficiently', () => {
      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        runtime.typeSystem.isValidTypeId('gts.hai3.mfes.ext.domain.v1~');
      }

      const executionTime = Date.now() - startTime;

      // Should complete quickly (allow generous time for CI/slower machines)
      expect(executionTime).toBeLessThan(1000); // 1 second for 1000 iterations
    });

    it('should perform type hierarchy checks efficiently', () => {
      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        runtime.typeSystem.isTypeOf(
          'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~',
          'gts.hai3.mfes.mfe.entry.v1~'
        );
      }

      const executionTime = Date.now() - startTime;

      // Should complete quickly
      expect(executionTime).toBeLessThan(1000);
    });
  });

  describe('12.1.5: Test custom plugin integration', () => {
    it('should work with custom TypeSystemPlugin wrapper', () => {
      // Create a custom plugin that wraps GTS
      const customPlugin = {
        ...gtsPlugin,
        name: 'custom-test',
        version: '1.0.0',
        // Override parseTypeId to add custom metadata
        parseTypeId: (id: string) => {
          const parsed = gtsPlugin.parseTypeId(id);
          return {
            ...parsed,
            custom: 'metadata',
          };
        },
      };

      const customRuntime = createScreensetsRegistry({
        typeSystem: customPlugin,
        debug: false,
      });

      // Verify custom plugin is used
      expect(customRuntime.typeSystem.name).toBe('custom-test');
      expect(customRuntime.typeSystem.version).toBe('1.0.0');

      // Standard operations should still work
      expect(customRuntime.typeSystem.isValidTypeId('gts.hai3.mfes.ext.domain.v1~')).toBe(true);

      // Verify custom metadata is present in parseTypeId
      const parsed = customRuntime.typeSystem.parseTypeId('gts.hai3.mfes.mfe.entry.v1~');
      expect(parsed).toHaveProperty('custom', 'metadata');
      expect(parsed).toHaveProperty('vendor', 'hai3');
    });

    it('should support custom plugin with extended functionality', () => {
      // Create a plugin with custom validation logic
      const validationCountPlugin = {
        ...gtsPlugin,
        name: 'validation-counter',
        version: '1.0.0',
        validationCount: 0,
        isValidTypeId: function(id: string): boolean {
          this.validationCount++;
          return gtsPlugin.isValidTypeId(id);
        },
      };

      const runtime2 = createScreensetsRegistry({
        typeSystem: validationCountPlugin,
        debug: false,
      });

      // Perform validations
      runtime2.typeSystem.isValidTypeId('gts.hai3.mfes.ext.domain.v1~');
      runtime2.typeSystem.isValidTypeId('gts.hai3.mfes.mfe.entry.v1~');
      runtime2.typeSystem.isValidTypeId('invalid');

      // Verify custom functionality
      expect(validationCountPlugin.validationCount).toBe(3);
    });
  });
});
