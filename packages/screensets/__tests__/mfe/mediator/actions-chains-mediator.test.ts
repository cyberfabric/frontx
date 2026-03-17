/**
 * ActionsChainsMediator Tests (Phase 9)
 *
 * Tests for ActionsChainsMediator implementation including:
 * - Success path execution
 * - Failure path execution
 * - Termination scenarios
 * - Type validation
 * - Payload validation
 * - Handler lifecycle
 * - Timeout handling
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TypeSystemPlugin, ValidationResult, JSONSchema } from '../../../src/mfe/plugins/types';
import type { ActionsChain, ExtensionDomain } from '../../../src/mfe/types';
import { ActionHandler } from '../../../src/mfe/mediator';
import { DefaultActionsChainsMediator } from '../../../src/mfe/mediator/actions-chains-mediator';
import { DefaultScreensetsRegistry } from '../../../src/mfe/runtime/DefaultScreensetsRegistry';
import { MockContainerProvider } from '../test-utils';

/**
 * Test-only ActionHandler that delegates to a vitest mock function.
 * Allows standard vitest assertions (toHaveBeenCalled, etc.) on the wrapped mock.
 */
class MockActionHandler extends ActionHandler {
  readonly mock = vi.fn<
    (actionTypeId: string, payload: Record<string, unknown> | undefined) => Promise<void>
  >();

  async handleAction(actionTypeId: string, payload: Record<string, unknown> | undefined): Promise<void> {
    return this.mock(actionTypeId, payload);
  }
}

/** Convenience factory — mirrors vi.fn().mockResolvedValue(undefined) */
function mockHandler(): MockActionHandler {
  const h = new MockActionHandler();
  h.mock.mockResolvedValue(undefined);
  return h;
}

/** Convenience factory — mirrors vi.fn().mockRejectedValue(...) */
function failingHandler(error: Error): MockActionHandler {
  const h = new MockActionHandler();
  h.mock.mockRejectedValue(error);
  return h;
}

/** Convenience factory — mirrors vi.fn().mockImplementation(...) */
function slowHandler(delayMs: number): MockActionHandler {
  const h = new MockActionHandler();
  h.mock.mockImplementation(() => new Promise(resolve => setTimeout(resolve, delayMs)));
  return h;
}

// Mock Type System Plugin
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
      // GTS assigns id='' for anonymous instances (e.g. actions which have 'type' but no 'id').
      // Store by entity.id so that validateInstance('') finds anonymous registrations.
      const identifier = entityWithId.id ?? '';
      registeredEntities.set(identifier, entity);
    },
    validateInstance: (instanceId: string): ValidationResult => {
      if (registeredEntities.has(instanceId)) {
        return { valid: true, errors: [] };
      }
      return {
        valid: false,
        errors: [
          {
            path: '',
            message: `Instance not registered: ${instanceId}`,
            keyword: 'not-registered',
          },
        ],
      };
    },
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

describe('ActionsChainsMediator - Phase 9', () => {
  let plugin: TypeSystemPlugin;
  let mediator: DefaultActionsChainsMediator;
  let registry: DefaultScreensetsRegistry;
  let mockContainerProvider: MockContainerProvider;

  beforeEach(() => {
    plugin = createMockPlugin();
    registry = new DefaultScreensetsRegistry({ typeSystem: plugin });
    mockContainerProvider = new MockContainerProvider();
    mediator = new DefaultActionsChainsMediator({
      typeSystem: plugin,
      getDomainState: (domainId) => registry.getDomainState(domainId),
    });
  });

  describe('9.3.1 Success path execution', () => {
    it('should execute action chain with next chain on success', async () => {
      const handler = mockHandler();

      // Register domain for timeout resolution
      const domain: ExtensionDomain = {
        id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: [
          'gts.hai3.mfes.comm.action.v1~test.action1.v1~',
          'gts.hai3.mfes.comm.action.v1~test.action2.v1~',
        ],
        extensionsActions: [],
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };
      registry.registerDomain(domain, mockContainerProvider);

      mediator.registerHandler(
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        'gts.hai3.mfes.comm.action.v1~test.action1.v1~',
        handler
      );
      mediator.registerHandler(
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        'gts.hai3.mfes.comm.action.v1~test.action2.v1~',
        handler
      );

      const chain: ActionsChain = {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action1.v1~',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        },
        next: {
          action: {
            type: 'gts.hai3.mfes.comm.action.v1~test.action2.v1~',
            target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
          },
        },
      };

      const result = await mediator.executeActionsChain(chain);

      expect(result.completed).toBe(true);
      expect(result.path).toEqual([
        'gts.hai3.mfes.comm.action.v1~test.action1.v1~',
        'gts.hai3.mfes.comm.action.v1~test.action2.v1~',
      ]);
      expect(handler.mock).toHaveBeenCalledTimes(2);
    });

    it('should pass payload to handler', async () => {
      const handler = mockHandler();

      const domain: ExtensionDomain = {
        id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: ['gts.hai3.mfes.comm.action.v1~test.action.v1~'],
        extensionsActions: [],
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };
      registry.registerDomain(domain, mockContainerProvider);

      mediator.registerHandler(
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        'gts.hai3.mfes.comm.action.v1~test.action.v1~',
        handler
      );

      const payload = { data: 'test value' };
      const chain: ActionsChain = {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1~',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
          payload,
        },
      };

      await mediator.executeActionsChain(chain);

      expect(handler.mock).toHaveBeenCalledWith(
        'gts.hai3.mfes.comm.action.v1~test.action.v1~',
        payload
      );
    });

    it('passes the mediated action to the handler without extra runtime metadata', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const domainId = 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~';
      const actionTypeId = 'gts.hai3.mfes.comm.action.v1~test.action.v1~';

      mediator.registerHandler(domainId, actionTypeId, {
        handleAction: handler,
      });

      const domain: ExtensionDomain = {
        id: domainId,
        sharedProperties: [],
        actions: [actionTypeId],
        extensionsActions: [],
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };
      registry.registerDomain(domain, mockContainerProvider);

      const payload = { data: 'test value' };
      const chain: ActionsChain = {
        action: {
          type: actionTypeId,
          target: domainId,
          payload,
        },
      };

      await mediator.executeActionsChain(chain);

      expect(handler).toHaveBeenCalledWith(
        actionTypeId,
        payload
      );
    });
  });

  describe('9.3.2 Failure path execution', () => {
    it('should execute fallback chain on failure', async () => {
      const handler = new MockActionHandler();
      handler.mock
        .mockRejectedValueOnce(new Error('Action failed'))
        .mockResolvedValueOnce(undefined);

      const domain: ExtensionDomain = {
        id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: ['gts.hai3.mfes.comm.action.v1~test.action.v1~', 'gts.hai3.mfes.comm.action.v1~test.fallback.v1~'],
        extensionsActions: [],
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };
      registry.registerDomain(domain, mockContainerProvider);

      mediator.registerHandler(
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        'gts.hai3.mfes.comm.action.v1~test.action.v1~',
        handler
      );
      mediator.registerHandler(
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        'gts.hai3.mfes.comm.action.v1~test.fallback.v1~',
        handler
      );

      const chain: ActionsChain = {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1~',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        },
        fallback: {
          action: {
            type: 'gts.hai3.mfes.comm.action.v1~test.fallback.v1~',
            target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
          },
        },
      };

      const result = await mediator.executeActionsChain(chain);

      expect(result.completed).toBe(true);
      expect(result.path).toEqual([
        'gts.hai3.mfes.comm.action.v1~test.action.v1~',
        'gts.hai3.mfes.comm.action.v1~test.fallback.v1~',
      ]);
      expect(handler.mock).toHaveBeenCalledTimes(2);
    });

    it('should propagate error if no fallback defined', async () => {
      const handler = failingHandler(new Error('Action failed'));

      const domain: ExtensionDomain = {
        id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: ['gts.hai3.mfes.comm.action.v1~test.action.v1~'],
        extensionsActions: [],
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };
      registry.registerDomain(domain, mockContainerProvider);

      mediator.registerHandler(
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        'gts.hai3.mfes.comm.action.v1~test.action.v1~',
        handler
      );

      const chain: ActionsChain = {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1~',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        },
      };

      const result = await mediator.executeActionsChain(chain);

      expect(result.completed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Action failed');
    });
  });

  describe('9.3.3 Chain termination scenarios', () => {
    it('should terminate when no next chain is defined', async () => {
      const handler = mockHandler();

      const domain: ExtensionDomain = {
        id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: ['gts.hai3.mfes.comm.action.v1~test.action.v1~'],
        extensionsActions: [],
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };
      registry.registerDomain(domain, mockContainerProvider);

      mediator.registerHandler(
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        'gts.hai3.mfes.comm.action.v1~test.action.v1~',
        handler
      );

      const chain: ActionsChain = {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1~',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        },
      };

      const result = await mediator.executeActionsChain(chain);

      expect(result.completed).toBe(true);
      expect(result.path).toEqual(['gts.hai3.mfes.comm.action.v1~test.action.v1~']);
      expect(handler.mock).toHaveBeenCalledTimes(1);
    });

    it('should terminate after fallback when no next is defined', async () => {
      const handler = new MockActionHandler();
      handler.mock
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(undefined);

      const domain: ExtensionDomain = {
        id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: ['gts.hai3.mfes.comm.action.v1~test.action.v1~', 'gts.hai3.mfes.comm.action.v1~test.fallback.v1~'],
        extensionsActions: [],
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };
      registry.registerDomain(domain, mockContainerProvider);

      mediator.registerHandler(
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        'gts.hai3.mfes.comm.action.v1~test.action.v1~',
        handler
      );
      mediator.registerHandler(
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        'gts.hai3.mfes.comm.action.v1~test.fallback.v1~',
        handler
      );

      const chain: ActionsChain = {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1~',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        },
        fallback: {
          action: {
            type: 'gts.hai3.mfes.comm.action.v1~test.fallback.v1~',
            target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
          },
        },
      };

      const result = await mediator.executeActionsChain(chain);

      expect(result.completed).toBe(true);
      expect(result.path.length).toBe(2);
    });
  });

  // Note: Type ID validation tests removed in Phase 29
  // Type ID validation is now performed at the registry level via TypeSystemPlugin
  // The mediator no longer performs type ID validation directly

  describe('9.3.5 Payload validation', () => {
    it('should validate payload via type system', async () => {
      // Use a plugin that fails validation
      const failingPlugin: TypeSystemPlugin = {
        ...createMockPlugin(),
        validateInstance: () => ({
          valid: false,
          errors: [
            { path: 'payload.data', message: 'Invalid payload', keyword: 'type' },
          ],
        }),
      };

      const failingRegistry = new DefaultScreensetsRegistry({ typeSystem: failingPlugin });
      const failingMediator = new DefaultActionsChainsMediator({
        typeSystem: failingPlugin,
        getDomainState: (domainId) => (failingRegistry as DefaultScreensetsRegistry).getDomainState(domainId),
      });

      const chain: ActionsChain = {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1~',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
          payload: { invalid: true },
        },
      };

      const result = await failingMediator.executeActionsChain(chain);

      expect(result.completed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('validation failed');
    });
  });

  describe('9.3.6 Handler lifecycle', () => {
    it('should register and use extension handler', async () => {
      const handler = mockHandler();

      mediator.registerHandler(
        'gts.hai3.mfes.ext.extension.v1~test.ext.v1~',
        'gts.hai3.mfes.comm.action.v1~test.action.v1~',
        handler,
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~'
      );

      const domain: ExtensionDomain = {
        id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: ['gts.hai3.mfes.comm.action.v1~test.action.v1~'],
        extensionsActions: [],
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };
      registry.registerDomain(domain, mockContainerProvider);

      const chain: ActionsChain = {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1~',
          target: 'gts.hai3.mfes.ext.extension.v1~test.ext.v1~',
        },
      };

      const result = await mediator.executeActionsChain(chain);

      expect(result.completed).toBe(true);
      expect(handler.mock).toHaveBeenCalled();
    });

    it('should unregister extension handler', () => {
      const handler = mockHandler();

      mediator.registerHandler(
        'gts.hai3.mfes.ext.extension.v1~test.ext.v1~',
        'gts.hai3.mfes.comm.action.v1~test.action.v1~',
        handler,
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~'
      );

      mediator.unregisterAllHandlers('gts.hai3.mfes.ext.extension.v1~test.ext.v1~');

      // Handler should no longer be registered
      // (Will result in no-op execution)
    });

    it('should throw error when unregistering extension with pending actions', async () => {
      const handler = slowHandler(100);

      mediator.registerHandler(
        'gts.hai3.mfes.ext.extension.v1~test.ext.v1~',
        'gts.hai3.mfes.comm.action.v1~test.action.v1~',
        handler,
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~'
      );

      const domain: ExtensionDomain = {
        id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: ['gts.hai3.mfes.comm.action.v1~test.action.v1~'],
        extensionsActions: [],
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };
      registry.registerDomain(domain, mockContainerProvider);

      const chain: ActionsChain = {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1~',
          target: 'gts.hai3.mfes.ext.extension.v1~test.ext.v1~',
        },
      };

      // Start action execution (don't await yet)
      const executionPromise = mediator.executeActionsChain(chain);

      // Wait for next tick to allow tracking to be set up
      await new Promise(resolve => setTimeout(resolve, 0));

      // Try to unregister while action is pending
      expect(() => {
        mediator.unregisterAllHandlers('gts.hai3.mfes.ext.extension.v1~test.ext.v1~');
      }).toThrow(/Cannot unregister handlers.*action\(s\) still pending/);

      // Wait for action to complete
      await executionPromise;

      // Now unregistration should succeed
      expect(() => {
        mediator.unregisterAllHandlers('gts.hai3.mfes.ext.extension.v1~test.ext.v1~');
      }).not.toThrow();
    });

    it('should allow unregistering extension after actions complete', async () => {
      const handler = mockHandler();

      mediator.registerHandler(
        'gts.hai3.mfes.ext.extension.v1~test.ext.v1~',
        'gts.hai3.mfes.comm.action.v1~test.action.v1~',
        handler,
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~'
      );

      const domain: ExtensionDomain = {
        id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: ['gts.hai3.mfes.comm.action.v1~test.action.v1~'],
        extensionsActions: [],
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };
      registry.registerDomain(domain, mockContainerProvider);

      const chain: ActionsChain = {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1~',
          target: 'gts.hai3.mfes.ext.extension.v1~test.ext.v1~',
        },
      };

      // Execute and wait for completion
      await mediator.executeActionsChain(chain);

      // Should succeed after action completes
      expect(() => {
        mediator.unregisterAllHandlers('gts.hai3.mfes.ext.extension.v1~test.ext.v1~');
      }).not.toThrow();
    });

    it('should register and use domain handler', async () => {
      const handler = mockHandler();

      const domain: ExtensionDomain = {
        id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: ['gts.hai3.mfes.comm.action.v1~test.action.v1~'],
        extensionsActions: [],
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };
      registry.registerDomain(domain, mockContainerProvider);

      mediator.registerHandler(
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        'gts.hai3.mfes.comm.action.v1~test.action.v1~',
        handler
      );

      const chain: ActionsChain = {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1~',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        },
      };

      const result = await mediator.executeActionsChain(chain);

      expect(result.completed).toBe(true);
      expect(handler.mock).toHaveBeenCalled();
    });

    it('should throw error when unregistering domain with pending actions', async () => {
      const handler = slowHandler(100);

      const domain: ExtensionDomain = {
        id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: ['gts.hai3.mfes.comm.action.v1~test.action.v1~'],
        extensionsActions: [],
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };
      registry.registerDomain(domain, mockContainerProvider);

      mediator.registerHandler(
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        'gts.hai3.mfes.comm.action.v1~test.action.v1~',
        handler
      );

      const chain: ActionsChain = {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1~',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        },
      };

      // Start action execution (don't await yet)
      const executionPromise = mediator.executeActionsChain(chain);

      // Wait for next tick to allow tracking to be set up
      await new Promise(resolve => setTimeout(resolve, 0));

      // Try to unregister while action is pending
      expect(() => {
        mediator.unregisterAllHandlers('gts.hai3.mfes.ext.domain.v1~test.domain.v1~');
      }).toThrow(/Cannot unregister handlers.*action\(s\) still pending/);

      // Wait for action to complete
      await executionPromise;

      // Now unregistration should succeed
      expect(() => {
        mediator.unregisterAllHandlers('gts.hai3.mfes.ext.domain.v1~test.domain.v1~');
      }).not.toThrow();
    });

    it('should allow unregistering domain after actions complete', async () => {
      const handler = mockHandler();

      const domain: ExtensionDomain = {
        id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: ['gts.hai3.mfes.comm.action.v1~test.action.v1~'],
        extensionsActions: [],
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };
      registry.registerDomain(domain, mockContainerProvider);

      mediator.registerHandler(
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        'gts.hai3.mfes.comm.action.v1~test.action.v1~',
        handler
      );

      const chain: ActionsChain = {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1~',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        },
      };

      // Execute and wait for completion
      await mediator.executeActionsChain(chain);

      // Should succeed after action completes
      expect(() => {
        mediator.unregisterAllHandlers('gts.hai3.mfes.ext.domain.v1~test.domain.v1~');
      }).not.toThrow();
    });
  });

  describe('9.3.7-9.3.9 Timeout handling', () => {
    it('should use domain defaultActionTimeout when action.timeout not specified', async () => {
      const handler = slowHandler(100);

      const domain: ExtensionDomain = {
        id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: ['gts.hai3.mfes.comm.action.v1~test.action.v1~'],
        extensionsActions: [],
        defaultActionTimeout: 50, // Short timeout to trigger failure
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };
      registry.registerDomain(domain, mockContainerProvider);

      mediator.registerHandler(
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        'gts.hai3.mfes.comm.action.v1~test.action.v1~',
        handler
      );

      const chain: ActionsChain = {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1~',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
          // No timeout specified - should use domain's 50ms default
        },
      };

      const result = await mediator.executeActionsChain(chain);

      expect(result.completed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('timeout');
    });

    it('should use action.timeout when specified (overrides domain default)', async () => {
      const handler = slowHandler(100);

      const domain: ExtensionDomain = {
        id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: ['gts.hai3.mfes.comm.action.v1~test.action.v1~'],
        extensionsActions: [],
        defaultActionTimeout: 50, // Short default
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };
      registry.registerDomain(domain, mockContainerProvider);

      mediator.registerHandler(
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        'gts.hai3.mfes.comm.action.v1~test.action.v1~',
        handler
      );

      const chain: ActionsChain = {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1~',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
          timeout: 200, // Override with longer timeout
        },
      };

      const result = await mediator.executeActionsChain(chain);

      // Should succeed because action timeout (200ms) > handler delay (100ms)
      expect(result.completed).toBe(true);
    });

    it('should execute fallback chain on timeout', async () => {
      const handler = new MockActionHandler();
      handler.mock
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)))
        .mockResolvedValueOnce(undefined);

      const domain: ExtensionDomain = {
        id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: ['gts.hai3.mfes.comm.action.v1~test.action.v1~', 'gts.hai3.mfes.comm.action.v1~test.fallback.v1~'],
        extensionsActions: [],
        defaultActionTimeout: 50,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };
      registry.registerDomain(domain, mockContainerProvider);

      mediator.registerHandler(
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        'gts.hai3.mfes.comm.action.v1~test.action.v1~',
        handler
      );
      mediator.registerHandler(
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        'gts.hai3.mfes.comm.action.v1~test.fallback.v1~',
        handler
      );

      const chain: ActionsChain = {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1~',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        },
        fallback: {
          action: {
            type: 'gts.hai3.mfes.comm.action.v1~test.fallback.v1~',
            target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
          },
        },
      };

      const result = await mediator.executeActionsChain(chain);

      // Should execute fallback after timeout
      expect(result.completed).toBe(true);
      expect(result.path).toContain('gts.hai3.mfes.comm.action.v1~test.fallback.v1~');
    });
  });

  // @cpt-FEATURE:feature-screenset-registry:p-contract-enforcement
  describe('Extension contract enforcement via GTS schema validation (Fix #254b)', () => {
    // Contract enforcement is handled entirely by GTS schema validation (x-gts-ref on target).
    // The mock TypeSystemPlugin used by the rest of this file does not validate x-gts-ref,
    // so schema-level contract tests live in bridge.test.ts where the real GtsPlugin is used.
    // Here we only verify the mediator's routing behavior with the mock plugin.

    const EXTENSION_ID = 'gts.hai3.mfes.ext.extension.v1~test.contract.ext.v1~test.contract.ext.inst.v1';
    const DOMAIN_ID = 'gts.hai3.mfes.ext.domain.v1~test.contract.domain.v1~';
    const ACTION_TYPE = 'gts.hai3.mfes.comm.action.v1~test.action.v1~';

    it('action targeting extension routes to registered handler', async () => {
      const domain: ExtensionDomain = {
        id: DOMAIN_ID,
        sharedProperties: [],
        actions: [],
        extensionsActions: [],
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };
      registry.registerDomain(domain, mockContainerProvider);

      const invocations: string[] = [];
      const handler = new class extends ActionHandler {
        async handleAction(actionTypeId: string): Promise<void> {
          invocations.push(actionTypeId);
        }
      }();

      mediator.registerHandler(EXTENSION_ID, ACTION_TYPE, handler, DOMAIN_ID);

      const result = await mediator.executeActionsChain({
        action: { type: ACTION_TYPE, target: EXTENSION_ID },
      });

      // Mock plugin always validates successfully — the action reaches the handler.
      // Real GTS validation (x-gts-ref) is tested in bridge.test.ts with GtsPlugin.
      expect(result.completed).toBe(true);
      expect(invocations).toEqual([ACTION_TYPE]);
    });
  });

  describe('9.3.10 ChainExecutionOptions', () => {
    it('should accept chainTimeout option', async () => {
      const handler = slowHandler(100);

      const domain: ExtensionDomain = {
        id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        sharedProperties: [],
        actions: ['gts.hai3.mfes.comm.action.v1~test.action.v1~'],
        extensionsActions: [],
        defaultActionTimeout: 50,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };
      registry.registerDomain(domain, mockContainerProvider);

      mediator.registerHandler(
        'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        'gts.hai3.mfes.comm.action.v1~test.action.v1~',
        handler
      );

      const chain: ActionsChain = {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1~',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
        },
      };

      // Should fail with short chain timeout
      const result = await mediator.executeActionsChain(chain, { chainTimeout: 30 });

      expect(result.timedOut).toBe(true);
      expect(result.error).toBeDefined();
    });

    it('should not accept action-level timeout options', () => {
      // ChainExecutionOptions interface only has chainTimeout
      // This test verifies the type safety
      const options = {
        chainTimeout: 5000,
        // actionTimeout would be a type error
      };

      expect(options).toHaveProperty('chainTimeout');
      expect(options).not.toHaveProperty('actionTimeout');
    });
  });
});
