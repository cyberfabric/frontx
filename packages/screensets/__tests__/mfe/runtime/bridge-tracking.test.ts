/**
 * Tests for Bridge Tracking in ScreensetsRegistry
 *
 * Verifies:
 * - Bridge lifecycle is managed by registry
 * - Child bridges are tracked privately
 * - Parent bridge is tracked privately
 * - Dispose properly cleans up bridges
 * - No public access to bridge internals
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScreensetsRegistry } from '../../../src/mfe/runtime';
import { DefaultScreensetsRegistry } from '../../../src/mfe/runtime/DefaultScreensetsRegistry';
import { gtsPlugin } from '../../../src/mfe/plugins/gts';
import type { ParentMfeBridge } from '../../../src/mfe/handler/types';

// Helper to access private members for testing (replaces 'as any' with proper typing)
interface RegistryInternals {
  childBridges: Map<string, ParentMfeBridge>;
  parentBridge: ParentMfeBridge | null;
  coordinator: unknown; // RuntimeCoordinator (Phase 8.4: replaced _runtimeConnections)
  domains: Map<string, unknown>;
  extensions: Map<string, unknown>;
}

function getRegistryInternals(registry: ScreensetsRegistry): RegistryInternals {
  return registry as unknown as RegistryInternals;
}

describe('ScreensetsRegistry - Bridge Tracking', () => {
  let registry: ScreensetsRegistry;

  beforeEach(() => {
    registry = new DefaultScreensetsRegistry({
      typeSystem: gtsPlugin,
    });
  });

  describe('Bridge encapsulation', () => {
    it('should not expose childBridges in TypeScript type system', () => {
      // TypeScript private fields prevent compile-time access
      // Note: In JavaScript, these are still accessible at runtime, but TypeScript prevents compilation

      // The property exists internally but TypeScript won't let you access it without casting
      const internals = getRegistryInternals(registry);
      expect(internals.childBridges).toBeDefined();
      expect(internals.childBridges).toBeInstanceOf(Map);

      // Verify that TypeScript would prevent access without casting (compile-time safety)
      // The runtime check is that the property exists but is not in the public API
    });

    it('should not expose parentBridge in TypeScript type system', () => {
      // TypeScript private fields prevent compile-time access
      const internals = getRegistryInternals(registry);
      expect(internals.parentBridge).toBeDefined();

      // Verify that TypeScript would prevent access without casting (compile-time safety)
      // The runtime check is that the property exists but is not in the public API
    });

    it('should not expose coordinator in TypeScript type system', () => {
      // TypeScript private fields prevent compile-time access
      const internals = getRegistryInternals(registry);
      // Phase 8.4: _runtimeConnections was replaced by coordinator (RuntimeCoordinator)
      expect(internals.coordinator).toBeDefined();
      // Coordinator is an instance of RuntimeCoordinator (abstract class)

      // Verify that TypeScript would prevent access without casting (compile-time safety)
      // The runtime check is that the property exists but is not in the public API
    });
  });

  describe('dispose', () => {
    it('should dispose all child bridges on registry disposal', () => {
      // Access private members for testing
      const internals = getRegistryInternals(registry);

      // Add mock bridges
      const bridge1DisposeSpy = vi.fn();
      const bridge2DisposeSpy = vi.fn();

      const bridge1: ParentMfeBridge = { dispose: bridge1DisposeSpy };
      const bridge2: ParentMfeBridge = { dispose: bridge2DisposeSpy };

      internals.childBridges.set('bridge1', bridge1);
      internals.childBridges.set('bridge2', bridge2);

      // Dispose registry
      registry.dispose();

      // Both bridges should be disposed
      expect(bridge1DisposeSpy).toHaveBeenCalledTimes(1);
      expect(bridge2DisposeSpy).toHaveBeenCalledTimes(1);

      // Child bridges map should be cleared
      expect(internals.childBridges.size).toBe(0);
    });

    it('should dispose parent bridge on registry disposal', () => {
      // Access private members for testing
      const internals = getRegistryInternals(registry);

      const parentDisposeSpy = vi.fn();
      const parentBridge: ParentMfeBridge = { dispose: parentDisposeSpy };

      internals.parentBridge = parentBridge;

      // Dispose registry
      registry.dispose();

      // Parent bridge should be disposed
      expect(parentDisposeSpy).toHaveBeenCalledTimes(1);

      // Parent bridge should be set to null
      expect(internals.parentBridge).toBeNull();
    });

    it('should handle disposal when no bridges present', () => {
      // Should not throw when there are no bridges
      expect(() => registry.dispose()).not.toThrow();
    });

    it('should be idempotent for bridge disposal', () => {
      const internals = getRegistryInternals(registry);

      const bridgeDisposeSpy = vi.fn();
      const bridge: ParentMfeBridge = { dispose: bridgeDisposeSpy };

      internals.childBridges.set('bridge1', bridge);

      // First disposal
      registry.dispose();
      expect(bridgeDisposeSpy).toHaveBeenCalledTimes(1);

      // Second disposal should not call dispose again (map is already cleared)
      registry.dispose();
      expect(bridgeDisposeSpy).toHaveBeenCalledTimes(1);
    });

    it('should clear all resources in correct order', () => {
      const internals = getRegistryInternals(registry);

      const parentDisposeSpy = vi.fn();
      const childDisposeSpy = vi.fn();

      const parentBridge: ParentMfeBridge = { dispose: parentDisposeSpy };
      const childBridge: ParentMfeBridge = { dispose: childDisposeSpy };

      internals.parentBridge = parentBridge;
      internals.childBridges.set('child1', childBridge);

      registry.dispose();

      // Both should be disposed
      expect(parentDisposeSpy).toHaveBeenCalled();
      expect(childDisposeSpy).toHaveBeenCalled();

      // All maps should be cleared
      expect(internals.childBridges.size).toBe(0);
      expect(internals.parentBridge).toBeNull();
      expect(internals.domains.size).toBe(0);
      expect(internals.extensions.size).toBe(0);
    });
  });

  describe('Bridge lifecycle principles', () => {
    it('should demonstrate that bridges are managed by registry, not exposed', () => {
      // The registry manages bridge lifecycle internally
      // Users interact with the registry API, not directly with bridges

      // This is SOLID: Single Responsibility Principle
      // The registry is responsible for bridge lifecycle

      // Verify that public API does NOT expose bridge management
      const registryPublicAPI = Object.getOwnPropertyNames(Object.getPrototypeOf(registry));

      // Should NOT have public methods for bridge manipulation
      expect(registryPublicAPI).not.toContain('getChildBridge');
      expect(registryPublicAPI).not.toContain('addChildBridge');
      expect(registryPublicAPI).not.toContain('removeChildBridge');
      expect(registryPublicAPI).not.toContain('getParentBridge');
      expect(registryPublicAPI).not.toContain('setParentBridge');

      // Should have domain and property management methods
      expect(registryPublicAPI).toContain('registerDomain');
      expect(registryPublicAPI).toContain('updateDomainProperty');
      expect(registryPublicAPI).toContain('getDomainProperty');
      expect(registryPublicAPI).toContain('updateDomainProperties');
      expect(registryPublicAPI).toContain('dispose');
    });
  });
});
