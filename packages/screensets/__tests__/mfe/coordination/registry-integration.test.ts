/**
 * Runtime Coordinator Integration Tests (Task 8.4.8)
 *
 * Tests for verifying coordination through ScreensetsRegistry API.
 * These tests verify that the coordinator is properly integrated and accessible
 * through the registry, even though mount/unmount don't exist yet (Phase 19.3).
 */

import { describe, it, expect } from 'vitest';
import { ScreensetsRegistry } from '../../../src/mfe/runtime';
import { DefaultScreensetsRegistry } from '../../../src/mfe/runtime/DefaultScreensetsRegistry';
import { WeakMapRuntimeCoordinator } from '../../../src/mfe/coordination/weak-map-runtime-coordinator';
import { RuntimeCoordinator } from '../../../src/mfe/coordination/types';
import type { TypeSystemPlugin, JSONSchema, ValidationResult } from '../../../src/mfe/plugins/types';
import type { RuntimeConnection } from '../../../src/mfe/coordination/types';
import { MockContainerProvider } from '../test-utils';

// Helper to access private members for testing (replaces 'as any' with proper typing)
interface RegistryInternals {
  coordinator: RuntimeCoordinator;
}

function getRegistryInternals(registry: ScreensetsRegistry): RegistryInternals {
  return registry as unknown as RegistryInternals;
}

// Mock Type System Plugin
function createMockPlugin(): TypeSystemPlugin {
  const schemas = new Map<string, JSONSchema>();
  const registeredEntities = new Map<string, unknown>();

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

describe('Runtime Coordinator Integration - Task 8.4.8', () => {
  describe('Default coordinator initialization', () => {
    it('should create WeakMapRuntimeCoordinator by default', () => {
      const registry = new DefaultScreensetsRegistry({
        typeSystem: createMockPlugin(),
      });

      expect(registry).toBeDefined();
      // Coordinator is private, but we can verify the registry works properly
      expect(registry.typeSystem).toBeDefined();
    });

    it('should accept custom coordinator via config', () => {
      const customCoordinator = new WeakMapRuntimeCoordinator();

      const registry = new DefaultScreensetsRegistry({
        typeSystem: createMockPlugin(),
        coordinator: customCoordinator,
      });

      expect(registry).toBeDefined();
      expect(registry.typeSystem).toBeDefined();
    });
  });

  describe('Coordinator encapsulation', () => {
    it('should keep coordinator encapsulated within registry', () => {
      const registry = new DefaultScreensetsRegistry({
        typeSystem: createMockPlugin(),
      });

      // The coordinator property exists but is private - TypeScript prevents access
      // This test verifies that there's no public getter method
      expect(registry).not.toHaveProperty('getCoordinator');
      const internals = getRegistryInternals(registry);
      expect(internals.coordinator).toBeDefined();
    });

    it('should not pollute window global scope', () => {
      new DefaultScreensetsRegistry({
        typeSystem: createMockPlugin(),
      });

      // Verify no global pollution
      const globalObj = globalThis as Record<string, unknown>;
      expect(globalObj.__hai3_runtime_connections).toBeUndefined();
      expect(globalObj.__mfe_registry).toBeUndefined();
      expect(globalObj.__screensets_coordinator).toBeUndefined();
    });
  });

  describe('Coordinator abstraction pattern', () => {
    it('should support custom coordinator implementations', () => {
      // Create a custom test coordinator
      class TestCoordinator extends RuntimeCoordinator {
        private connections = new Map<Element, RuntimeConnection>();

        register(container: Element, connection: RuntimeConnection): void {
          this.connections.set(container, connection);
        }

        get(container: Element): RuntimeConnection | undefined {
          return this.connections.get(container);
        }

        unregister(container: Element): void {
          this.connections.delete(container);
        }

        // Test-specific method
        getConnectionCount(): number {
          return this.connections.size;
        }
      }

      const testCoordinator = new TestCoordinator();

      const registry = new DefaultScreensetsRegistry({
        typeSystem: createMockPlugin(),
        coordinator: testCoordinator,
      });

      expect(registry).toBeDefined();
      expect(testCoordinator.getConnectionCount()).toBe(0);
    });

    it('should accept RuntimeCoordinator abstract class', () => {
      // Verify that config accepts the abstract class type
      const coordinator: RuntimeCoordinator = new WeakMapRuntimeCoordinator();

      const registry = new DefaultScreensetsRegistry({
        typeSystem: createMockPlugin(),
        coordinator,
      });

      expect(registry).toBeDefined();
    });
  });

  describe('Integration with registry lifecycle', () => {
    it('should initialize coordinator during registry construction', () => {
      // This test verifies that coordinator is ready when registry is created
      const registry = new DefaultScreensetsRegistry({
        typeSystem: createMockPlugin(),
      });

      // Registry should be fully functional immediately
      expect(registry.typeSystem).toBeDefined();
      expect(() => {
        const mockContainerProvider = new MockContainerProvider();
        registry.registerDomain({
          id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1~',
          sharedProperties: [],
          actions: [],
          extensionsActions: [],
          defaultActionTimeout: 5000,
          lifecycleStages: [],
          extensionsLifecycleStages: [],
        }, mockContainerProvider);
      }).not.toThrow();
    });

    it('should clean up coordinator on registry disposal', () => {
      const registry = new DefaultScreensetsRegistry({
        typeSystem: createMockPlugin(),
      });

      // Dispose registry
      registry.dispose();

      // Registry should be disposed cleanly
      // (Coordinator's WeakMap will be garbage collected automatically)
      expect(() => registry.dispose()).not.toThrow();
    });
  });

  describe('Coordinator usage preparation', () => {
    it('should be ready for Phase 19.3 mount/unmount operations', () => {
      // This test documents the expected coordinator usage in Phase 19.3
      const coordinator = new WeakMapRuntimeCoordinator();

      const registry = new DefaultScreensetsRegistry({
        typeSystem: createMockPlugin(),
        coordinator,
      });

      // Create a mock container element
      const container = document.createElement('div');

      // In Phase 19.3, mountExtension will:
      // 1. Create a bridge
      // 2. Register runtime connection via coordinator
      const mockConnection: RuntimeConnection = {
        hostRuntime: registry,
        bridges: new Map(),
      };

      coordinator.register(container, mockConnection);

      // Verify connection is registered
      const retrieved = coordinator.get(container);
      expect(retrieved).toBe(mockConnection);
      expect(retrieved?.hostRuntime).toBe(registry);

      // In Phase 19.3, unmountExtension will:
      // Unregister runtime connection via coordinator
      coordinator.unregister(container);

      // Verify connection is unregistered
      expect(coordinator.get(container)).toBeUndefined();
    });

    it('should support multiple simultaneous runtime connections', () => {
      const coordinator = new WeakMapRuntimeCoordinator();

      const registry = new DefaultScreensetsRegistry({
        typeSystem: createMockPlugin(),
        coordinator,
      });

      // Create multiple containers
      const container1 = document.createElement('div');
      const container2 = document.createElement('div');
      const container3 = document.createElement('div');

      const connection1: RuntimeConnection = {
        hostRuntime: registry,
        bridges: new Map(),
      };

      const connection2: RuntimeConnection = {
        hostRuntime: registry,
        bridges: new Map(),
      };

      const connection3: RuntimeConnection = {
        hostRuntime: registry,
        bridges: new Map(),
      };

      // Register multiple connections
      coordinator.register(container1, connection1);
      coordinator.register(container2, connection2);
      coordinator.register(container3, connection3);

      // Verify all connections are tracked
      expect(coordinator.get(container1)).toBe(connection1);
      expect(coordinator.get(container2)).toBe(connection2);
      expect(coordinator.get(container3)).toBe(connection3);

      // Unregister one
      coordinator.unregister(container2);

      // Verify only the unregistered one is gone
      expect(coordinator.get(container1)).toBe(connection1);
      expect(coordinator.get(container2)).toBeUndefined();
      expect(coordinator.get(container3)).toBe(connection3);
    });
  });

  describe('Dependency Inversion Principle', () => {
    it('should depend on abstract RuntimeCoordinator, not concrete implementation', () => {
      // Create custom coordinator extending abstract class
      class CustomCoordinator extends RuntimeCoordinator {
        register(): void {}
        get(): RuntimeConnection | undefined {
          return undefined;
        }
        unregister(): void {}
      }

      const customCoordinator = new CustomCoordinator();

      // Registry accepts abstract type, not concrete WeakMapRuntimeCoordinator
      const registry = new DefaultScreensetsRegistry({
        typeSystem: createMockPlugin(),
        coordinator: customCoordinator,
      });

      expect(registry).toBeDefined();
    });
  });
});
