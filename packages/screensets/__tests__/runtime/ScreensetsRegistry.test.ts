/**
 * ScreensetsRegistry Tests
 *
 * Tests for Phase 4: ScreensetsRegistry with Plugin
 */

import { createScreensetsRegistry } from '../ScreensetsRegistry';
import type { ScreensetsRegistryConfig } from '../config';
import type { TypeSystemPlugin, ValidationResult, JSONSchema } from '../../plugins/types';
import type { ExtensionDomain, Action, ActionsChain } from '../../types';

// Mock Type System Plugin
function createMockPlugin(): TypeSystemPlugin {
  const schemas = new Map<string, JSONSchema>();

  // Add first-class citizen schemas
  const coreTypeIds = [
    'gts.hai3.screensets.mfe.entry.v1~',
    'gts.hai3.screensets.ext.domain.v1~',
    'gts.hai3.screensets.ext.extension.v1~',
    'gts.hai3.screensets.ext.shared_property.v1~',
    'gts.hai3.screensets.ext.action.v1~',
    'gts.hai3.screensets.ext.actions_chain.v1~',
    'gts.hai3.screensets.ext.lifecycle_stage.v1~',
    'gts.hai3.screensets.ext.lifecycle_hook.v1~',
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
    validateInstance: (_typeId: string, _instance: unknown): ValidationResult => {
      return { valid: true, errors: [] };
    },
    getSchema: (typeId: string) => schemas.get(typeId),
    query: (pattern: string, limit?: number) => {
      const results = Array.from(schemas.keys()).filter(id => id.includes(pattern));
      return limit ? results.slice(0, limit) : results;
    },
    isTypeOf: (typeId: string, baseTypeId: string) => {
      return typeId === baseTypeId || typeId.startsWith(baseTypeId);
    },
    checkCompatibility: () => ({
      compatible: true,
      breaking: false,
      changes: [],
    }),
    getAttribute: (typeId: string, path: string) => ({
      typeId,
      path,
      resolved: false,
    }),
  };
}

describe('ScreensetsRegistry - Phase 4', () => {
  const createTestConfig = (): ScreensetsRegistryConfig => ({
    typeSystem: createMockPlugin(),
    debug: false,
  });

  describe('4.1 Runtime Configuration', () => {
    it('should create registry with required typeSystem parameter', () => {
      const config = createTestConfig();
      const registry = createScreensetsRegistry(config);
      expect(registry).toBeDefined();
      expect(registry.typeSystem).toBe(config.typeSystem);
    });

    it('should throw error if typeSystem is missing', () => {
      const invalidConfig = {} as ScreensetsRegistryConfig;
      expect(() => createScreensetsRegistry(invalidConfig)).toThrow(
        'ScreensetsRegistry requires a TypeSystemPlugin'
      );
    });

    it('should accept optional onError callback', () => {
      const onError = jest.fn();
      const registryConfig: ScreensetsRegistryConfig = {
        typeSystem: createMockPlugin(),
        onError,
      };
      const registry = createScreensetsRegistry(registryConfig);
      expect(registry).toBeDefined();
    });

    it('should accept optional debug flag', () => {
      const registryConfig: ScreensetsRegistryConfig = {
        typeSystem: createMockPlugin(),
        debug: true,
      };
      const registry = createScreensetsRegistry(registryConfig);
      expect(registry).toBeDefined();
    });

    it('should accept optional loadingComponent', () => {
      const registryConfig: ScreensetsRegistryConfig = {
        typeSystem: createMockPlugin(),
        loadingComponent: 'LoadingComponent',
      };
      const registry = createScreensetsRegistry(registryConfig);
      expect(registry).toBeDefined();
    });

    it('should accept optional errorFallbackComponent', () => {
      const registryConfig: ScreensetsRegistryConfig = {
        typeSystem: createMockPlugin(),
        errorFallbackComponent: 'ErrorComponent',
      };
      const registry = createScreensetsRegistry(registryConfig);
      expect(registry).toBeDefined();
    });

    it('should accept optional mfeHandler', () => {
      const mockHandler = {
        bridgeFactory: {} as unknown,
        handledBaseTypeId: 'gts.hai3.screensets.mfe.entry.v1~',
        canHandle: () => true,
        load: async () => ({ lifecycle: {} as unknown, entry: {} as unknown, unload: () => {} }),
      };
      const registryConfig: ScreensetsRegistryConfig = {
        typeSystem: createMockPlugin(),
        mfeHandler: mockHandler as unknown,
      };
      const registry = createScreensetsRegistry(registryConfig);
      expect(registry).toBeDefined();
    });
  });

  describe('4.2 ScreensetsRegistry Core with Plugin', () => {
    it('should store plugin reference as readonly typeSystem', () => {
      const registry = createScreensetsRegistry(config);
      expect(registry.typeSystem).toBe(createMockPlugin());
      expect(registry.typeSystem.name).toBe('MockPlugin');
      expect(registry.typeSystem.version).toBe('1.0.0');
    });

    it('should verify first-class schemas are available', () => {
      const registry = createScreensetsRegistry(config);

      const coreTypeIds = [
        'gts.hai3.screensets.mfe.entry.v1~',
        'gts.hai3.screensets.ext.domain.v1~',
        'gts.hai3.screensets.ext.extension.v1~',
        'gts.hai3.screensets.ext.shared_property.v1~',
        'gts.hai3.screensets.ext.action.v1~',
        'gts.hai3.screensets.ext.actions_chain.v1~',
        'gts.hai3.screensets.ext.lifecycle_stage.v1~',
        'gts.hai3.screensets.ext.lifecycle_hook.v1~',
      ];

      for (const typeId of coreTypeIds) {
        const schema = registry.typeSystem.getSchema(typeId);
        expect(schema).toBeDefined();
      }
    });

    it('should throw error if plugin is missing first-class schemas', () => {
      const incompletePlugin: TypeSystemPlugin = {
        ...createMockPlugin(),
        getSchema: () => undefined, // Missing all schemas
      };

      const incompleteConfig: ScreensetsRegistryConfig = {
        typeSystem: incompletePlugin,
      };

      expect(() => createScreensetsRegistry(incompleteConfig)).toThrow(
        'TypeSystemPlugin is missing first-class citizen schemas'
      );
    });

    it('should register handler if provided in config', () => {
      const mockHandler = {
        bridgeFactory: {} as unknown,
        handledBaseTypeId: 'gts.hai3.screensets.mfe.entry.v1~',
        priority: 10,
        canHandle: () => true,
        load: async () => ({ lifecycle: {} as unknown, entry: {} as unknown, unload: () => {} }),
      };

      const registryConfig: ScreensetsRegistryConfig = {
        typeSystem: createMockPlugin(),
        mfeHandler: mockHandler as unknown,
      };

      const registry = createScreensetsRegistry(registryConfig);
      expect(registry).toBeDefined();
    });
  });

  describe('4.3 Type ID Validation via Plugin', () => {
    it('should validate domain type ID via plugin before registration', () => {
      const registry = createScreensetsRegistry(config);

      const validDomain: ExtensionDomain = {
        id: 'gts.hai3.screensets.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: [],
        extensionsActions: [],
        extensionsUiMeta: {},
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };

      expect(() => registry.registerDomain(validDomain)).not.toThrow();
    });

    it('should validate action type ID via plugin before chain execution', async () => {
      const registry = createScreensetsRegistry(config);

      const validAction: Action = {
        type: 'gts.hai3.screensets.ext.action.v1~test.action.v1~',
        target: 'gts.hai3.screensets.ext.domain.v1~test.domain.v1~',
      };

      const chain: ActionsChain = {
        action: validAction,
      };

      const result = await registry.executeActionsChain(chain);
      expect(result.completed).toBe(true);
    });

    it('should return validation error if type IDs are invalid', async () => {
      const registry = createScreensetsRegistry(config);

      const invalidAction: Action = {
        type: 'invalid-type-id', // Missing required format
        target: 'invalid-target',
      };

      const chain: ActionsChain = {
        action: invalidAction,
      };

      const result = await registry.executeActionsChain(chain);
      expect(result.completed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Invalid type ID');
    });
  });

  describe('4.4 Payload Validation via Plugin', () => {
    it('should validate payload via plugin before delivery', async () => {
      const registry = createScreensetsRegistry(config);

      const actionWithPayload: Action = {
        type: 'gts.hai3.screensets.ext.action.v1~test.action.v1~',
        target: 'gts.hai3.screensets.ext.domain.v1~test.domain.v1~',
        payload: { data: 'test' },
      };

      const chain: ActionsChain = {
        action: actionWithPayload,
      };

      const result = await registry.executeActionsChain(chain);
      expect(result.completed).toBe(true);
    });

    it('should return validation error on payload failure', async () => {
      const failingPlugin: TypeSystemPlugin = {
        ...createMockPlugin(),
        validateInstance: () => ({
          valid: false,
          errors: [
            { path: 'payload.data', message: 'Invalid data format', keyword: 'type' },
          ],
        }),
      };

      const registryConfig: ScreensetsRegistryConfig = {
        typeSystem: failingPlugin,
      };

      const registry = createScreensetsRegistry(registryConfig);

      const actionWithInvalidPayload: Action = {
        type: 'gts.hai3.screensets.ext.action.v1~test.action.v1~',
        target: 'gts.hai3.screensets.ext.domain.v1~test.domain.v1~',
        payload: { data: 123 }, // Invalid
      };

      const chain: ActionsChain = {
        action: actionWithInvalidPayload,
      };

      const result = await registry.executeActionsChain(chain);
      expect(result.completed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Action validation failed');
    });

    it('should allow actions without payload', async () => {
      const registry = createScreensetsRegistry(config);

      const actionWithoutPayload: Action = {
        type: 'gts.hai3.screensets.ext.action.v1~test.action.v1~',
        target: 'gts.hai3.screensets.ext.domain.v1~test.domain.v1~',
      };

      const chain: ActionsChain = {
        action: actionWithoutPayload,
      };

      const result = await registry.executeActionsChain(chain);
      expect(result.completed).toBe(true);
    });
  });

  describe('Registry Events', () => {
    it('should emit domainRegistered event', () => {
      const registry = createScreensetsRegistry(config);
      const callback = jest.fn();

      registry.on('domainRegistered', callback);

      const domain: ExtensionDomain = {
        id: 'gts.hai3.screensets.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: [],
        extensionsActions: [],
        extensionsUiMeta: {},
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };

      registry.registerDomain(domain);

      expect(callback).toHaveBeenCalledWith({ domainId: domain.id });
    });

    it('should allow unsubscribing from events', () => {
      const registry = createScreensetsRegistry(config);
      const callback = jest.fn();

      registry.on('domainRegistered', callback);
      registry.off('domainRegistered', callback);

      const domain: ExtensionDomain = {
        id: 'gts.hai3.screensets.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: [],
        extensionsActions: [],
        extensionsUiMeta: {},
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };

      registry.registerDomain(domain);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Registry Disposal', () => {
    it('should dispose registry and clean up resources', () => {
      const registry = createScreensetsRegistry(config);

      const domain: ExtensionDomain = {
        id: 'gts.hai3.screensets.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: [],
        extensionsActions: [],
        extensionsUiMeta: {},
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };

      registry.registerDomain(domain);
      registry.dispose();

      // After disposal, registry should be clean
      expect(() => registry.dispose()).not.toThrow();
    });
  });
});
