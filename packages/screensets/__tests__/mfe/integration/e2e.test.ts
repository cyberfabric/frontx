import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultScreensetsRegistry } from '../../../src/mfe/runtime/DefaultScreensetsRegistry';
import { gtsPlugin } from '../../../src/mfe/plugins/gts';
import type { ScreensetsRegistry } from '../../../src/mfe/runtime';
import { HAI3_SCREEN_EXTENSION_TYPE } from '../../../src/mfe/constants';

describe('Phase 12.1: Integration Testing', () => {
  let runtime: ScreensetsRegistry;

  beforeEach(() => {
    runtime = new DefaultScreensetsRegistry({
      typeSystem: gtsPlugin,
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


  describe('12.1.4: Performance testing for type system operations', () => {
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
      const customPlugin: TypeSystemPlugin = {
        name: 'custom-test',
        version: '1.0.0',
        registerSchema: (schema) => gtsPlugin.registerSchema(schema),
        getSchema: (typeId: string) => gtsPlugin.getSchema(typeId),
        register: (entity: unknown) => gtsPlugin.register(entity),
        validateInstance: (instanceId: string) => gtsPlugin.validateInstance(instanceId),
        isTypeOf: (typeId: string, baseTypeId: string) => gtsPlugin.isTypeOf(typeId, baseTypeId),
        checkCompatibility: (oldTypeId: string, newTypeId: string) => gtsPlugin.checkCompatibility(oldTypeId, newTypeId),
        getAttribute: (typeId: string, path: string) => gtsPlugin.getAttribute(typeId, path),
      };

      const customRuntime = new DefaultScreensetsRegistry({
        typeSystem: customPlugin,
      });

      // Verify custom plugin is used
      expect(customRuntime.typeSystem.name).toBe('custom-test');
      expect(customRuntime.typeSystem.version).toBe('1.0.0');

      // Standard operations should still work
      const schema = customRuntime.typeSystem.getSchema('gts.hai3.mfes.ext.domain.v1~');
      expect(schema).toBeDefined();
    });
  });

  describe('Phase 37: Screen Extension Derived Type Schema Validation', () => {
    it('should have extension_screen.v1 schema loaded as built-in', () => {
      // Verify the screen extension derived type schema is registered
      const schema = runtime.typeSystem.getSchema(HAI3_SCREEN_EXTENSION_TYPE);
      expect(schema).toBeDefined();
      expect(schema?.$id).toContain('extension.v1~hai3.screensets.layout.screen.v1~');
    });

    it('should check type hierarchy for screen extension derived type', () => {
      // Screen extension type derives from base extension type
      expect(
        runtime.typeSystem.isTypeOf(
          HAI3_SCREEN_EXTENSION_TYPE,
          'gts.hai3.mfes.ext.extension.v1~'
        )
      ).toBe(true);

      // Base extension type does NOT derive from screen extension type
      expect(
        runtime.typeSystem.isTypeOf(
          'gts.hai3.mfes.ext.extension.v1~',
          HAI3_SCREEN_EXTENSION_TYPE
        )
      ).toBe(false);
    });

    it('should have screen extension schema with presentation field', () => {
      // Verify the screen extension schema defines presentation property
      const schema = runtime.typeSystem.getSchema(HAI3_SCREEN_EXTENSION_TYPE);
      expect(schema).toBeDefined();

      // The schema should extend base extension and add presentation
      // Check that schema has allOf with base reference and presentation requirement
      expect(schema?.allOf).toBeDefined();
      expect(Array.isArray(schema?.allOf)).toBe(true);

      // Check for presentation in required fields or properties
      const hasPresentation =
        schema?.required?.includes('presentation') ||
        schema?.properties?.presentation !== undefined;
      expect(hasPresentation).toBe(true);
    });

    it('should have base extension schema without presentation field', () => {
      // Verify base extension schema does NOT have presentation
      const baseSchema = runtime.typeSystem.getSchema('gts.hai3.mfes.ext.extension.v1~');
      expect(baseSchema).toBeDefined();

      // Base schema should NOT have presentation in required or properties
      const hasPresentation =
        baseSchema?.required?.includes('presentation') ||
        baseSchema?.properties?.presentation !== undefined;
      expect(hasPresentation).toBe(false);
    });
  });
});
