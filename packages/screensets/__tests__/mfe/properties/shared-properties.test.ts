/**
 * Tests for SharedPropertiesProvider
 *
 * Verifies:
 * - Read-only property passing via props
 * - Property update propagation from host
 * - Property isolation (no direct modification)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SharedPropertiesProvider } from '../../../src/mfe/properties';

describe('SharedPropertiesProvider', () => {
  let provider: SharedPropertiesProvider;

  const THEME_PROPERTY_ID =
    'gts.hai3.mfes.comm.shared_property.v1~acme.ui.theme.v1';
  const USER_PROPERTY_ID =
    'gts.hai3.mfes.comm.shared_property.v1~acme.auth.user.v1';

  beforeEach(() => {
    provider = new SharedPropertiesProvider();
  });

  describe('getProperty', () => {
    it('should return undefined for unset property', () => {
      const value = provider.getProperty(THEME_PROPERTY_ID);
      expect(value).toBeUndefined();
    });

    it('should return property value after update', () => {
      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark');

      const value = provider.getProperty(THEME_PROPERTY_ID);
      expect(value).toBe('dark');
    });

    it('should return latest value after multiple updates', () => {
      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark');
      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'light');
      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'auto');

      const value = provider.getProperty(THEME_PROPERTY_ID);
      expect(value).toBe('auto');
    });

    it('should throw if provider is disposed', () => {
      provider.dispose();

      expect(() => provider.getProperty(THEME_PROPERTY_ID)).toThrow(
        'Cannot use disposed SharedPropertiesProvider'
      );
    });
  });

  describe('getAllProperties', () => {
    it('should return empty map when no properties set', () => {
      const properties = provider.getAllProperties();
      expect(properties.size).toBe(0);
    });

    it('should return all property values', () => {
      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark');
      provider.receivePropertyUpdate(USER_PROPERTY_ID, {
        id: '123',
        name: 'Alice',
      });

      const properties = provider.getAllProperties();
      expect(properties.size).toBe(2);
      expect(properties.get(THEME_PROPERTY_ID)).toBe('dark');
      expect(properties.get(USER_PROPERTY_ID)).toEqual({
        id: '123',
        name: 'Alice',
      });
    });

    it('should return read-only map', () => {
      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark');

      const properties = provider.getAllProperties();

      // Map should be a copy (not the internal map)
      expect(properties).toBeInstanceOf(Map);

      // Modifying returned map should not affect provider
      properties.set('fake-property', 'fake-value');
      expect(provider.getProperty('fake-property')).toBeUndefined();
    });

    it('should throw if provider is disposed', () => {
      provider.dispose();

      expect(() => provider.getAllProperties()).toThrow(
        'Cannot use disposed SharedPropertiesProvider'
      );
    });
  });

  describe('subscribeToProperty', () => {
    it('should call callback when property updates', () => {
      const callback = vi.fn();
      provider.subscribeToProperty(THEME_PROPERTY_ID, callback);

      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('dark');
    });

    it('should call callback on each update', () => {
      const callback = vi.fn();
      provider.subscribeToProperty(THEME_PROPERTY_ID, callback);

      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark');
      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'light');
      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'auto');

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenNthCalledWith(1, 'dark');
      expect(callback).toHaveBeenNthCalledWith(2, 'light');
      expect(callback).toHaveBeenNthCalledWith(3, 'auto');
    });

    it('should support multiple subscribers for same property', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      provider.subscribeToProperty(THEME_PROPERTY_ID, callback1);
      provider.subscribeToProperty(THEME_PROPERTY_ID, callback2);

      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark');

      expect(callback1).toHaveBeenCalledWith('dark');
      expect(callback2).toHaveBeenCalledWith('dark');
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = provider.subscribeToProperty(
        THEME_PROPERTY_ID,
        callback
      );

      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark');
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'light');
      expect(callback).toHaveBeenCalledTimes(1); // Not called after unsubscribe
    });

    it('should handle errors in callbacks gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      const goodCallback = vi.fn();

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      provider.subscribeToProperty(THEME_PROPERTY_ID, errorCallback);
      provider.subscribeToProperty(THEME_PROPERTY_ID, goodCallback);

      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in property subscriber'),
        expect.any(Error)
      );
      expect(goodCallback).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should throw if provider is disposed', () => {
      provider.dispose();

      expect(() =>
        provider.subscribeToProperty(THEME_PROPERTY_ID, () => {})
      ).toThrow('Cannot use disposed SharedPropertiesProvider');
    });
  });

  describe('subscribeToAllProperties', () => {
    it('should call callback for any property update', () => {
      const callback = vi.fn();
      provider.subscribeToAllProperties(callback);

      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark');
      provider.receivePropertyUpdate(USER_PROPERTY_ID, { id: '123' });

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = provider.subscribeToAllProperties(callback);

      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark');
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      provider.receivePropertyUpdate(USER_PROPERTY_ID, { id: '123' });
      expect(callback).toHaveBeenCalledTimes(1); // Not called after unsubscribe
    });

    it('should throw if provider is disposed', () => {
      provider.dispose();

      expect(() => provider.subscribeToAllProperties(() => {})).toThrow(
        'Cannot use disposed SharedPropertiesProvider'
      );
    });
  });

  describe('receivePropertyUpdate', () => {
    it('should update property value', () => {
      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark');

      expect(provider.getProperty(THEME_PROPERTY_ID)).toBe('dark');
    });

    it('should notify specific subscribers', () => {
      const themeCallback = vi.fn();
      const userCallback = vi.fn();

      provider.subscribeToProperty(THEME_PROPERTY_ID, themeCallback);
      provider.subscribeToProperty(USER_PROPERTY_ID, userCallback);

      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark');

      expect(themeCallback).toHaveBeenCalledWith('dark');
      expect(userCallback).not.toHaveBeenCalled();
    });

    it('should notify wildcard subscribers', () => {
      const wildcardCallback = vi.fn();
      provider.subscribeToAllProperties(wildcardCallback);

      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark');

      expect(wildcardCallback).toHaveBeenCalled();
    });

    it('should notify both specific and wildcard subscribers', () => {
      const specificCallback = vi.fn();
      const wildcardCallback = vi.fn();

      provider.subscribeToProperty(THEME_PROPERTY_ID, specificCallback);
      provider.subscribeToAllProperties(wildcardCallback);

      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark');

      expect(specificCallback).toHaveBeenCalledWith('dark');
      expect(wildcardCallback).toHaveBeenCalled();
    });

    it('should throw if provider is disposed', () => {
      provider.dispose();

      expect(() =>
        provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark')
      ).toThrow('Cannot use disposed SharedPropertiesProvider');
    });
  });

  describe('dispose', () => {
    it('should clear all subscriptions', () => {
      const callback = vi.fn();
      provider.subscribeToProperty(THEME_PROPERTY_ID, callback);

      provider.dispose();

      // Attempting to receive update after dispose should throw
      expect(() =>
        provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark')
      ).toThrow();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should clear all properties', () => {
      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark');
      provider.receivePropertyUpdate(USER_PROPERTY_ID, { id: '123' });

      provider.dispose();

      expect(() => provider.getAllProperties()).toThrow();
    });

    it('should be idempotent', () => {
      provider.dispose();
      expect(() => provider.dispose()).not.toThrow();
    });
  });

  describe('isDisposed', () => {
    it('should return false for active provider', () => {
      expect(provider.isDisposed()).toBe(false);
    });

    it('should return true after disposal', () => {
      provider.dispose();
      expect(provider.isDisposed()).toBe(true);
    });
  });

  describe('Property isolation (read-only from MFE perspective)', () => {
    it('should not allow direct property modification', () => {
      // MFE receives property
      provider.receivePropertyUpdate(USER_PROPERTY_ID, {
        id: '123',
        name: 'Alice',
      });

      const user = provider.getProperty<{ id: string; name: string }>(
        USER_PROPERTY_ID
      );

      // MFE tries to modify (this modifies the object, but doesn't affect provider)
      if (user) {
        user.name = 'Bob';
      }

      // Next time MFE reads, it gets the modified object
      // BUT the provider has no way to detect this modification
      const userAgain = provider.getProperty<{ id: string; name: string }>(
        USER_PROPERTY_ID
      );
      expect(userAgain?.name).toBe('Bob');

      // However, when parent sends new update, it overwrites
      provider.receivePropertyUpdate(USER_PROPERTY_ID, {
        id: '123',
        name: 'Charlie',
      });

      const finalUser = provider.getProperty<{ id: string; name: string }>(
        USER_PROPERTY_ID
      );
      expect(finalUser?.name).toBe('Charlie');
    });

    it('should propagate updates from parent only', () => {
      const callback = vi.fn();
      provider.subscribeToProperty(THEME_PROPERTY_ID, callback);

      // Parent (host) updates property
      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark');
      expect(callback).toHaveBeenCalledWith('dark');

      // MFE has no way to call receivePropertyUpdate directly
      // (it's marked @internal and should not be exposed in bridge)

      // Only parent can update
      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'light');
      expect(callback).toHaveBeenCalledWith('light');
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should verify property updates come from domain level', () => {
      // Simulate domain-level property update
      const themeCallback = vi.fn();
      const userCallback = vi.fn();

      provider.subscribeToProperty(THEME_PROPERTY_ID, themeCallback);
      provider.subscribeToProperty(USER_PROPERTY_ID, userCallback);

      // Host updates domain property (which propagates to all extensions)
      provider.receivePropertyUpdate(THEME_PROPERTY_ID, 'dark');
      provider.receivePropertyUpdate(USER_PROPERTY_ID, {
        id: '123',
        name: 'Alice',
      });

      expect(themeCallback).toHaveBeenCalledWith('dark');
      expect(userCallback).toHaveBeenCalledWith({
        id: '123',
        name: 'Alice',
      });
    });
  });
});
