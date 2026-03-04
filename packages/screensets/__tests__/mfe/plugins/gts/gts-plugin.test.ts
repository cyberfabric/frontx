/**
 * GTS Plugin Tests
 *
 * Tests for the GTS Type System Plugin implementation.
 * These tests verify the TypeSystemPlugin interface implementation.
 */

import { describe, it, expect } from 'vitest';
import { gtsPlugin, GtsPlugin } from '../../../../src/mfe/plugins/gts/index';
import { HAI3_CORE_TYPE_IDS } from '../../../../src/mfe/init';
import { HAI3_SHARED_PROPERTY_THEME, HAI3_SHARED_PROPERTY_LANGUAGE } from '../../../../src/mfe/constants';

describe('GTS Plugin', () => {
  describe('schema registration and validation', () => {
    const plugin = new GtsPlugin();

    it('has all core schemas registered', () => {
      const schema = plugin.getSchema(HAI3_CORE_TYPE_IDS.mfeEntry);
      expect(schema).toBeDefined();
      expect(schema?.$id).toBe('gts://gts.hai3.mfes.mfe.entry.v1~');
    });

    it('validates instance with required fields', () => {
      // GTS-native validation approach:
      // 1. Register the instance
      // 2. Validate by instance ID only
      const instance = {
        id: 'gts.hai3.mfes.mfe.entry.v1~test.app.mfe.test_entry.v1',
        requiredProperties: [],
        actions: [],
        domainActions: [],
      };
      // Step 1: Register the instance
      plugin.register(instance);
      // Step 2: Validate by instance ID (gts-ts extracts schema ID automatically)
      const result = plugin.validateInstance(instance.id);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('fails validation for missing required field', () => {
      // GTS-native validation approach:
      // 1. Register the instance
      // 2. Validate by instance ID only
      const instance = {
        id: 'gts.hai3.mfes.mfe.entry.v1~test.app.mfe.invalid_entry.v1',
        requiredProperties: [],
        // Missing: actions, domainActions
      };
      // Step 1: Register the instance
      plugin.register(instance);
      // Step 2: Validate by instance ID (gts-ts extracts schema ID automatically)
      const result = plugin.validateInstance(instance.id);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('registers vendor schema', () => {
      const vendorSchema = {
        $id: 'gts://gts.acme.analytics.ext.action.v1~',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          type: { type: 'string' },
          target: { type: 'string' },
          payload: { type: 'object' },
        },
        required: ['type', 'target'],
      };

      plugin.registerSchema(vendorSchema);
      const retrieved = plugin.getSchema('gts.acme.analytics.ext.action.v1~');
      expect(retrieved).toBeDefined();
      expect(retrieved?.$id).toBe('gts://gts.acme.analytics.ext.action.v1~');
    });
  });

  describe('gtsPlugin singleton', () => {
    it('exports singleton instance', () => {
      expect(gtsPlugin).toBeDefined();
      expect(gtsPlugin.name).toBe('gts');
      expect(gtsPlugin.version).toBe('1.0.0');
    });

    it('singleton has all schemas registered', () => {
      const schema = gtsPlugin.getSchema(HAI3_CORE_TYPE_IDS.mfeEntry);
      expect(schema).toBeDefined();
    });
  });

  describe('isTypeOf - type hierarchy checking', () => {
    const plugin = new GtsPlugin();

    it('same type returns true', () => {
      const result = plugin.isTypeOf(
        'gts.hai3.mfes.mfe.entry.v1~',
        'gts.hai3.mfes.mfe.entry.v1~'
      );
      expect(result).toBe(true);
    });

    it('derived type returns true for base type', () => {
      const result = plugin.isTypeOf(
        'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~',
        'gts.hai3.mfes.mfe.entry.v1~'
      );
      expect(result).toBe(true);
    });

    it('base type returns false for derived type', () => {
      const result = plugin.isTypeOf(
        'gts.hai3.mfes.mfe.entry.v1~',
        'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~'
      );
      expect(result).toBe(false);
    });

    it('different types return false', () => {
      const result = plugin.isTypeOf(
        'gts.hai3.mfes.ext.domain.v1~',
        'gts.hai3.mfes.mfe.entry.v1~'
      );
      expect(result).toBe(false);
    });
  });

  describe('shared property base schema', () => {
    it('base schema has value property (unconstrained)', () => {
      const schema = gtsPlugin.getSchema('gts.hai3.mfes.comm.shared_property.v1~');
      expect(schema).toBeDefined();
      const properties = schema?.properties as Record<string, unknown>;
      expect(properties).toHaveProperty('value');
      expect(properties.value).toEqual({});
    });

    it('base schema does NOT have supportedValues property', () => {
      const schema = gtsPlugin.getSchema('gts.hai3.mfes.comm.shared_property.v1~');
      expect(schema).toBeDefined();
      const properties = schema?.properties as Record<string, unknown>;
      expect(properties).not.toHaveProperty('supportedValues');
    });

    it('base schema requires only id', () => {
      const schema = gtsPlugin.getSchema('gts.hai3.mfes.comm.shared_property.v1~');
      expect(schema).toBeDefined();
      expect(schema?.required).toEqual(['id']);
      expect(schema?.required).not.toContain('supportedValues');
      expect(schema?.required).not.toContain('value');
    });
  });

  describe('derived theme shared property schema', () => {
    it('theme schema is registered as a schema (type ID ending with ~)', () => {
      const schema = gtsPlugin.getSchema(HAI3_SHARED_PROPERTY_THEME);
      expect(schema).toBeDefined();
      expect(HAI3_SHARED_PROPERTY_THEME.endsWith('~')).toBe(true);
    });

    it('theme schema has $id ending with ~', () => {
      const schema = gtsPlugin.getSchema(HAI3_SHARED_PROPERTY_THEME);
      expect(schema?.$id).toBe(`gts://${HAI3_SHARED_PROPERTY_THEME}`);
    });

    it('theme schema constrains value to non-empty string', () => {
      const schema = gtsPlugin.getSchema(HAI3_SHARED_PROPERTY_THEME);
      expect(schema).toBeDefined();
      const properties = schema?.properties as Record<string, { type?: string; minLength?: number }>;
      expect(properties.value).toBeDefined();
      expect(properties.value.type).toBe('string');
      expect(properties.value.minLength).toBe(1);
    });

    it('theme schema uses allOf derivation from base', () => {
      const schema = gtsPlugin.getSchema(HAI3_SHARED_PROPERTY_THEME);
      expect(schema).toBeDefined();
      expect(Array.isArray((schema as Record<string, unknown>).allOf)).toBe(true);
    });

    it('theme schema does NOT have supportedValues', () => {
      const schema = gtsPlugin.getSchema(HAI3_SHARED_PROPERTY_THEME);
      const properties = schema?.properties as Record<string, unknown>;
      expect(properties).not.toHaveProperty('supportedValues');
    });
  });

  describe('derived language shared property schema', () => {
    it('language schema is registered as a schema (type ID ending with ~)', () => {
      const schema = gtsPlugin.getSchema(HAI3_SHARED_PROPERTY_LANGUAGE);
      expect(schema).toBeDefined();
      expect(HAI3_SHARED_PROPERTY_LANGUAGE.endsWith('~')).toBe(true);
    });

    it('language schema has $id ending with ~', () => {
      const schema = gtsPlugin.getSchema(HAI3_SHARED_PROPERTY_LANGUAGE);
      expect(schema?.$id).toBe(`gts://${HAI3_SHARED_PROPERTY_LANGUAGE}`);
    });

    it('language schema constrains value to 36 enum strings', () => {
      const schema = gtsPlugin.getSchema(HAI3_SHARED_PROPERTY_LANGUAGE);
      expect(schema).toBeDefined();
      const properties = schema?.properties as Record<string, { type?: string; enum?: string[] }>;
      expect(properties.value).toBeDefined();
      expect(properties.value.type).toBe('string');
      expect(properties.value.enum).toHaveLength(36);
    });

    it('language schema uses allOf derivation from base', () => {
      const schema = gtsPlugin.getSchema(HAI3_SHARED_PROPERTY_LANGUAGE);
      expect(schema).toBeDefined();
      expect(Array.isArray((schema as Record<string, unknown>).allOf)).toBe(true);
    });

    it('language schema does NOT have supportedValues', () => {
      const schema = gtsPlugin.getSchema(HAI3_SHARED_PROPERTY_LANGUAGE);
      const properties = schema?.properties as Record<string, unknown>;
      expect(properties).not.toHaveProperty('supportedValues');
    });
  });

  describe('shared property runtime validation via named instances', () => {
    const plugin = new GtsPlugin();

    it('valid theme value passes validation using named instance pattern', () => {
      // Named instance: chained GTS ID encodes the schema, no type field
      const ephemeralId = `${HAI3_SHARED_PROPERTY_THEME}hai3.mfes.comm.runtime.v1`;
      plugin.register({ id: ephemeralId, value: 'dark' });
      const result = plugin.validateInstance(ephemeralId);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('empty theme value fails validation using named instance pattern', () => {
      const ephemeralId = `${HAI3_SHARED_PROPERTY_THEME}hai3.mfes.comm.runtime.v1`;
      plugin.register({ id: ephemeralId, value: '' });
      const result = plugin.validateInstance(ephemeralId);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('valid language value passes validation using named instance pattern', () => {
      const ephemeralId = `${HAI3_SHARED_PROPERTY_LANGUAGE}hai3.mfes.comm.runtime.v1`;
      plugin.register({ id: ephemeralId, value: 'fr' });
      const result = plugin.validateInstance(ephemeralId);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('invalid language value fails validation using named instance pattern', () => {
      // 'klingon' is not a valid language code
      const ephemeralId = `${HAI3_SHARED_PROPERTY_LANGUAGE}hai3.mfes.comm.runtime.v1`;
      plugin.register({ id: ephemeralId, value: 'klingon' });
      const result = plugin.validateInstance(ephemeralId);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('re-registering same ephemeral ID overwrites previous named instance', () => {
      const ephemeralId = `${HAI3_SHARED_PROPERTY_THEME}hai3.mfes.comm.runtime.v1`;
      plugin.register({ id: ephemeralId, value: '' });
      const firstResult = plugin.validateInstance(ephemeralId);
      expect(firstResult.valid).toBe(false);

      plugin.register({ id: ephemeralId, value: 'light' });
      const secondResult = plugin.validateInstance(ephemeralId);
      expect(secondResult.valid).toBe(true);
    });

    it('schema is extracted from the chained ID — no type field used', () => {
      // Confirm that registration without a type field succeeds for valid values
      const ephemeralId = `${HAI3_SHARED_PROPERTY_THEME}hai3.mfes.comm.runtime.v1`;
      const entity: Record<string, unknown> = { id: ephemeralId, value: 'dark' };
      expect(entity).not.toHaveProperty('type');
      plugin.register(entity);
      const result = plugin.validateInstance(ephemeralId);
      expect(result.valid).toBe(true);
    });
  });

  describe('extension presentation metadata', () => {
    it('base extension schema does NOT include presentation field', () => {
      const schema = gtsPlugin.getSchema('gts.hai3.mfes.ext.extension.v1~');
      expect(schema).toBeDefined();
      expect(schema?.properties).not.toHaveProperty('presentation');
    });

    it('screen extension derived schema includes presentation field (required)', () => {
      const schema = gtsPlugin.getSchema('gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~');
      expect(schema).toBeDefined();
      expect(schema?.properties).toHaveProperty('presentation');
      expect((schema?.properties as Record<string, unknown>).presentation).toMatchObject({
        type: 'object',
        properties: {
          label: { type: 'string' },
          icon: { type: 'string' },
          route: { type: 'string' },
          order: { type: 'number' },
        },
        required: ['label', 'route'],
      });
      expect(schema?.required).toContain('presentation');
    });
  });
});
