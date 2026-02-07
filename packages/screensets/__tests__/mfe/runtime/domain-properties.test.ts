/**
 * Tests for Domain Property Management in ScreensetsRegistry
 *
 * Verifies:
 * - Domain property updates via registry methods
 * - Property value retrieval
 * - Batch property updates
 * - Property subscriber notifications
 * - Proper error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScreensetsRegistry } from '../../../src/mfe/runtime/ScreensetsRegistry';
import type { ExtensionDomain } from '../../../src/mfe/types';
import type { TypeSystemPlugin, ValidationResult, JSONSchema } from '../../../src/mfe/plugins/types';

// Create a lenient mock plugin for testing domain properties
function createMockPlugin(): TypeSystemPlugin {
  const schemas = new Map<string, JSONSchema>();
  const registeredEntities = new Map<string, unknown>();

  // Add first-class citizen schemas
  const coreTypeIds = [
    'gts.hai3.mfes.mfe.entry.v1~',
    'gts.hai3.mfes.ext.domain.v1~',
    'gts.hai3.mfes.ext.extension.v1~',
    'gts.hai3.mfes.comm.shared_property.v1~',
    'gts.hai3.mfes.comm.action.v1~',
    'gts.hai3.mfes.comm.actions_chain.v1~',
    'gts.hai3.mfes.lifecycle.stage.v1~',
    'gts.hai3.mfes.lifecycle.hook.v1~',
  ];

  for (const typeId of coreTypeIds) {
    schemas.set(typeId, { $id: `gts://${typeId}`, type: 'object' });
  }

  return {
    name: 'MockPlugin',
    version: '1.0.0',
    isValidTypeId: (id: string) => id.includes('gts.') && id.endsWith('~'),
    parseTypeId: (id: string) => ({ id, segments: id.split('.') }),
    registerSchema: (schema: JSONSchema) => {
      if (schema.$id) {
        const typeId = schema.$id.replace('gts://', '');
        schemas.set(typeId, schema);
      }
    },
    getSchema: (typeId: string) => schemas.get(typeId),
    register: (entity: unknown) => {
      const entityWithId = entity as { id?: string };
      if (entityWithId.id) {
        registeredEntities.set(entityWithId.id, entity);
      }
    },
    validateInstance: (instanceId: string): ValidationResult => {
      if (registeredEntities.has(instanceId)) {
        return { valid: true, errors: [] };
      }
      return {
        valid: false,
        errors: [{ path: '', message: `Instance not registered: ${instanceId}` }],
      };
    },
    isTypeOf: (typeId: string, baseTypeId: string) => {
      return typeId.startsWith(baseTypeId);
    },
    checkCompatibility: () => ({ compatible: true, changes: [] }),
    getAttribute: () => undefined,
  };
}

describe('ScreensetsRegistry - Domain Properties', () => {
  let registry: ScreensetsRegistry;
  let testDomain: ExtensionDomain;
  const DOMAIN_ID = 'gts.hai3.mfes.ext.domain.v1~hai3.test.widget.slot.v1';
  const THEME_PROPERTY_ID = 'gts.hai3.mfes.comm.shared_property.v1~acme.ui.theme.v1';
  const USER_PROPERTY_ID = 'gts.hai3.mfes.comm.shared_property.v1~acme.auth.user.v1';

  beforeEach(() => {
    registry = new ScreensetsRegistry({
      typeSystem: createMockPlugin(),
    });

    testDomain = {
      id: DOMAIN_ID,
      sharedProperties: [THEME_PROPERTY_ID, USER_PROPERTY_ID],
      actions: [],
      extensionsActions: [],
      defaultActionTimeout: 5000,
      lifecycleStages: [
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
      ],
      extensionsLifecycleStages: [
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
      ],
    };

    registry.registerDomain(testDomain);
  });

  describe('updateDomainProperty', () => {
    it('should update a single domain property', () => {
      registry.updateDomainProperty(DOMAIN_ID, THEME_PROPERTY_ID, 'dark');

      const value = registry.getDomainProperty(DOMAIN_ID, THEME_PROPERTY_ID);
      expect(value).toBe('dark');
    });

    it('should throw if domain not registered', () => {
      expect(() => {
        registry.updateDomainProperty('non-existent-domain', THEME_PROPERTY_ID, 'dark');
      }).toThrow("Domain 'non-existent-domain' not registered");
    });

    it('should throw if property not declared in domain', () => {
      const undeclaredProperty = 'gts.hai3.mfes.comm.shared_property.v1~undeclared.v1';

      expect(() => {
        registry.updateDomainProperty(DOMAIN_ID, undeclaredProperty, 'value');
      }).toThrow(`Property '${undeclaredProperty}' not declared in domain '${DOMAIN_ID}'`);
    });

    it('should allow multiple updates to same property', () => {
      registry.updateDomainProperty(DOMAIN_ID, THEME_PROPERTY_ID, 'dark');
      registry.updateDomainProperty(DOMAIN_ID, THEME_PROPERTY_ID, 'light');
      registry.updateDomainProperty(DOMAIN_ID, THEME_PROPERTY_ID, 'auto');

      const value = registry.getDomainProperty(DOMAIN_ID, THEME_PROPERTY_ID);
      expect(value).toBe('auto');
    });

    it('should handle complex property values', () => {
      const userValue = { id: '123', name: 'Alice', roles: ['admin'] };
      registry.updateDomainProperty(DOMAIN_ID, USER_PROPERTY_ID, userValue);

      const value = registry.getDomainProperty(DOMAIN_ID, USER_PROPERTY_ID);
      expect(value).toEqual(userValue);
    });
  });

  describe('getDomainProperty', () => {
    it('should return undefined for unset property', () => {
      const value = registry.getDomainProperty(DOMAIN_ID, THEME_PROPERTY_ID);
      expect(value).toBeUndefined();
    });

    it('should return property value after update', () => {
      registry.updateDomainProperty(DOMAIN_ID, THEME_PROPERTY_ID, 'dark');

      const value = registry.getDomainProperty(DOMAIN_ID, THEME_PROPERTY_ID);
      expect(value).toBe('dark');
    });

    it('should throw if domain not registered', () => {
      expect(() => {
        registry.getDomainProperty('non-existent-domain', THEME_PROPERTY_ID);
      }).toThrow("Domain 'non-existent-domain' not registered");
    });

    it('should return different values for different properties', () => {
      registry.updateDomainProperty(DOMAIN_ID, THEME_PROPERTY_ID, 'dark');
      registry.updateDomainProperty(DOMAIN_ID, USER_PROPERTY_ID, { id: '123' });

      expect(registry.getDomainProperty(DOMAIN_ID, THEME_PROPERTY_ID)).toBe('dark');
      expect(registry.getDomainProperty(DOMAIN_ID, USER_PROPERTY_ID)).toEqual({ id: '123' });
    });
  });

  describe('updateDomainProperties', () => {
    it('should update multiple properties at once', () => {
      const properties = new Map([
        [THEME_PROPERTY_ID, 'dark'],
        [USER_PROPERTY_ID, { id: '123', name: 'Alice' }],
      ]);

      registry.updateDomainProperties(DOMAIN_ID, properties);

      expect(registry.getDomainProperty(DOMAIN_ID, THEME_PROPERTY_ID)).toBe('dark');
      expect(registry.getDomainProperty(DOMAIN_ID, USER_PROPERTY_ID)).toEqual({
        id: '123',
        name: 'Alice',
      });
    });

    it('should handle empty property map', () => {
      const properties = new Map<string, unknown>();

      expect(() => {
        registry.updateDomainProperties(DOMAIN_ID, properties);
      }).not.toThrow();
    });

    it('should throw for undeclared properties in batch', () => {
      const properties = new Map([
        [THEME_PROPERTY_ID, 'dark'],
        ['gts.hai3.mfes.comm.shared_property.v1~undeclared.v1', 'value'],
      ]);

      expect(() => {
        registry.updateDomainProperties(DOMAIN_ID, properties);
      }).toThrow(/Property.*not declared in domain/);

      // First property should have been updated before error
      expect(registry.getDomainProperty(DOMAIN_ID, THEME_PROPERTY_ID)).toBe('dark');
    });
  });

  describe('Property isolation between domains', () => {
    let domain2: ExtensionDomain;
    const DOMAIN2_ID = 'gts.hai3.mfes.ext.domain.v1~hai3.test.other.slot.v1';

    beforeEach(() => {
      domain2 = {
        id: DOMAIN2_ID,
        sharedProperties: [THEME_PROPERTY_ID],
        actions: [],
        extensionsActions: [],
        defaultActionTimeout: 5000,
        lifecycleStages: [
          'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
        ],
        extensionsLifecycleStages: [
          'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
        ],
      };

      registry.registerDomain(domain2);
    });

    it('should keep properties isolated between domains', () => {
      registry.updateDomainProperty(DOMAIN_ID, THEME_PROPERTY_ID, 'dark');
      registry.updateDomainProperty(DOMAIN2_ID, THEME_PROPERTY_ID, 'light');

      expect(registry.getDomainProperty(DOMAIN_ID, THEME_PROPERTY_ID)).toBe('dark');
      expect(registry.getDomainProperty(DOMAIN2_ID, THEME_PROPERTY_ID)).toBe('light');
    });
  });

  describe('dispose', () => {
    it('should clear all domain properties on dispose', () => {
      registry.updateDomainProperty(DOMAIN_ID, THEME_PROPERTY_ID, 'dark');
      registry.updateDomainProperty(DOMAIN_ID, USER_PROPERTY_ID, { id: '123' });

      registry.dispose();

      // After dispose, domain should no longer exist
      expect(() => {
        registry.getDomainProperty(DOMAIN_ID, THEME_PROPERTY_ID);
      }).toThrow(/Domain.*not registered/);
    });
  });
});
