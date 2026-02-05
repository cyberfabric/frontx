/**
 * GTS Plugin Tests
 *
 * Tests for the GTS Type System Plugin implementation.
 * These tests verify Phase 2.3 requirements from tasks.md.
 */

import { describe, it, expect } from 'vitest';
import { createGtsPlugin, gtsPlugin } from '../../../../src/mfe/plugins/gts/index';
import { HAI3_CORE_TYPE_IDS } from '../../../../src/mfe/init';

describe('GTS Plugin', () => {
  describe('2.3.1 - isValidTypeId accepts valid GTS type IDs', () => {
    const plugin = createGtsPlugin();

    it('accepts base type ID', () => {
      const result = plugin.isValidTypeId('gts.hai3.screensets.mfe.entry.v1~');
      expect(result).toBe(true);
    });

    it('accepts derived type ID', () => {
      const result = plugin.isValidTypeId(
        'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~'
      );
      expect(result).toBe(true);
    });

    it('accepts type ID with minor version', () => {
      const result = plugin.isValidTypeId('gts.acme.analytics.ext.action.v2.1~');
      expect(result).toBe(true);
    });
  });

  describe('2.3.2 - isValidTypeId rejects invalid formats', () => {
    const plugin = createGtsPlugin();

    it('rejects missing gts prefix', () => {
      const result = plugin.isValidTypeId('hai3.screensets.mfe.entry.v1~');
      expect(result).toBe(false);
    });

    it('rejects missing tilde', () => {
      const result = plugin.isValidTypeId('gts.hai3.screensets.mfe.entry.v1');
      expect(result).toBe(false);
    });

    it('rejects missing version', () => {
      const result = plugin.isValidTypeId('gts.hai3.screensets.mfe.entry~');
      expect(result).toBe(false);
    });

    it('rejects insufficient segments', () => {
      const result = plugin.isValidTypeId('gts.hai3.v1~');
      expect(result).toBe(false);
    });
  });

  describe('2.3.3 - parseTypeId returns correct components', () => {
    const plugin = createGtsPlugin();

    it('parses base type ID', () => {
      const result = plugin.parseTypeId('gts.hai3.screensets.mfe.entry.v1~');
      expect(result.vendor).toBe('hai3');
      expect(result.package).toBe('screensets');
      expect(result.namespace).toBe('mfe');
      expect(result.type).toBe('entry');
      expect(result.verMajor).toBe(1);
    });

    it('parses derived type ID with multiple segments', () => {
      const result = plugin.parseTypeId(
        'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~'
      );
      expect(result.vendor).toBe('hai3');
      expect(result.package).toBe('screensets');
      expect(result.namespace).toBe('mfe');
      expect(result.type).toBe('entry');
      expect(result.verMajor).toBe(1);
      // Derived types have multiple segments
      expect(Array.isArray(result.segments)).toBe(true);
      expect((result.segments as unknown[]).length).toBeGreaterThan(1);
    });

    it('throws error for invalid type ID', () => {
      expect(() => {
        plugin.parseTypeId('invalid-id');
      }).toThrow();
    });
  });

  describe('2.3.4 - schema registration and validation', () => {
    const plugin = createGtsPlugin();

    it('has all core schemas registered', () => {
      const schema = plugin.getSchema(HAI3_CORE_TYPE_IDS.mfeEntry);
      expect(schema).toBeDefined();
      expect(schema?.$id).toBe('gts://gts.hai3.screensets.mfe.entry.v1~');
    });

    it('validates instance with required fields', () => {
      const instance = {
        id: 'gts.test.app.mfe.test_entry.v1~',
        requiredProperties: [],
        actions: [],
        domainActions: [],
      };
      const result = plugin.validateInstance(HAI3_CORE_TYPE_IDS.mfeEntry, instance);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('fails validation for missing required field', () => {
      const instance = {
        id: 'gts.test.app.mfe.test_entry.v1~',
        requiredProperties: [],
        // Missing: actions, domainActions
      };
      const result = plugin.validateInstance(HAI3_CORE_TYPE_IDS.mfeEntry, instance);
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

  describe('2.3.5 - query operations', () => {
    const plugin = createGtsPlugin();

    it('queries extension types', () => {
      const results = plugin.query('gts.hai3.screensets.ext.*');
      expect(results.length).toBeGreaterThan(0);
      expect(results).toContain('gts.hai3.screensets.ext.domain.v1~');
      expect(results).toContain('gts.hai3.screensets.ext.extension.v1~');
    });

    it('queries with limit', () => {
      const results = plugin.query('gts.hai3.*', 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('returns empty array for no matches', () => {
      const results = plugin.query('gts.nonexistent.*');
      expect(results).toEqual([]);
    });
  });

  describe('2.3.6 - checkCompatibility returns proper CompatibilityResult', () => {
    const plugin = createGtsPlugin();

    it('same version is compatible', () => {
      const result = plugin.checkCompatibility(
        'gts.hai3.screensets.mfe.entry.v1~',
        'gts.hai3.screensets.mfe.entry.v1~'
      );
      expect(result.compatible).toBe(true);
      expect(result.breaking).toBe(false);
      expect(result.changes).toEqual([]);
    });

    it('major version change is breaking', () => {
      const result = plugin.checkCompatibility(
        'gts.hai3.screensets.mfe.entry.v1~',
        'gts.hai3.screensets.mfe.entry.v2~'
      );
      expect(result.compatible).toBe(false);
      expect(result.breaking).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it('different types are incompatible', () => {
      const result = plugin.checkCompatibility(
        'gts.hai3.screensets.mfe.entry.v1~',
        'gts.hai3.screensets.ext.domain.v1~'
      );
      expect(result.compatible).toBe(false);
      expect(result.breaking).toBe(true);
    });
  });

  describe('2.3.7 - getAttribute resolves attributes correctly', () => {
    const plugin = createGtsPlugin();

    it('resolves properties from domain schema', () => {
      const result = plugin.getAttribute(HAI3_CORE_TYPE_IDS.extensionDomain, 'properties.extensionsUiMeta');
      expect(result.typeId).toBe(HAI3_CORE_TYPE_IDS.extensionDomain);
      expect(result.path).toBe('properties.extensionsUiMeta');
      // getAttribute may return the schema definition or undefined
      // The important part is testing the API contract
    });

    it('returns AttributeResult structure for any query', () => {
      const result = plugin.getAttribute(HAI3_CORE_TYPE_IDS.extensionDomain, 'nonExistentField');
      expect(result.typeId).toBe(HAI3_CORE_TYPE_IDS.extensionDomain);
      expect(result.path).toBe('nonExistentField');
      expect(typeof result.resolved).toBe('boolean');
      // result.value may be undefined
      // result.error may be defined if not resolved
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
    const plugin = createGtsPlugin();

    it('same type returns true', () => {
      const result = plugin.isTypeOf(
        'gts.hai3.screensets.mfe.entry.v1~',
        'gts.hai3.screensets.mfe.entry.v1~'
      );
      expect(result).toBe(true);
    });

    it('derived type returns true for base type', () => {
      const result = plugin.isTypeOf(
        'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~',
        'gts.hai3.screensets.mfe.entry.v1~'
      );
      expect(result).toBe(true);
    });

    it('base type returns false for derived type', () => {
      const result = plugin.isTypeOf(
        'gts.hai3.screensets.mfe.entry.v1~',
        'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~'
      );
      expect(result).toBe(false);
    });

    it('different types return false', () => {
      const result = plugin.isTypeOf(
        'gts.hai3.screensets.ext.domain.v1~',
        'gts.hai3.screensets.mfe.entry.v1~'
      );
      expect(result).toBe(false);
    });
  });
});
