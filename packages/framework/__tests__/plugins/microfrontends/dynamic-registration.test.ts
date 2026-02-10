/**
 * Tests for dynamic registration - Phase 20
 *
 * Tests dynamic registration actions, effects, slice state, and selectors.
 *
 * @packageDocumentation
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHAI3 } from '../../../src/createHAI3';
import { screensets } from '../../../src/plugins/screensets';
import { effects } from '../../../src/plugins/effects';
import {
  microfrontends,
  registerExtension,
  unregisterExtension,
  registerDomain,
  unregisterDomain,
  MfeEvents,
  selectExtensionState,
  selectRegisteredExtensions,
} from '../../../src/plugins/microfrontends';
import { eventBus } from '@hai3/state';
import type { Extension, ExtensionDomain } from '@hai3/screensets';
import type { HAI3App } from '../../../src/types';

describe('dynamic registration - Phase 20', () => {
  let apps: HAI3App[] = [];

  afterEach(() => {
    // Cleanup all apps created in tests
    apps.forEach(app => app.destroy());
    apps = [];
  });
  const mockExtension: Extension = {
    id: 'gts.hai3.mfes.ext.extension.v1~test.app.test.extension.v1',
    domain: 'gts.hai3.mfes.ext.domain.v1~test.app.test.domain.v1',
    entry: 'gts.hai3.mfes.mfe.entry.v1~test.app.test.entry.v1',
  };

  const mockDomain: ExtensionDomain = {
    id: 'gts.hai3.mfes.ext.domain.v1~test.app.test.domain.v1',
    sharedProperties: [],
    actions: ['gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.load_ext.v1'],
    extensionsActions: [],
    defaultActionTimeout: 5000,
    lifecycleStages: [],
    extensionsLifecycleStages: [],
  };

  describe('20.5.1 - registerExtension action emits event', () => {
    let eventSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      eventSpy = vi.fn();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should emit registerExtensionRequested event', () => {
      const unsub = eventBus.on(MfeEvents.RegisterExtensionRequested, eventSpy);

      registerExtension(mockExtension);

      expect(eventSpy).toHaveBeenCalledWith({
        extension: mockExtension,
      });

      unsub.unsubscribe();
    });
  });

  describe('20.5.2 - registerExtension effect calls runtime', () => {
    it('should dispatch setExtensionRegistering and setExtensionRegistered on success', async () => {
      const app = createHAI3().use(screensets()).use(effects()).use(microfrontends()).build();
      apps.push(app);

      // Mock runtime method
      const registerExtensionSpy = vi.fn().mockResolvedValue(undefined);
      app.screensetsRegistry.registerExtension = registerExtensionSpy;

      // First register the domain
      app.screensetsRegistry.registerDomain(mockDomain);

      // Trigger action
      registerExtension(mockExtension);

      // Wait for async effect
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify runtime method was called
      expect(registerExtensionSpy).toHaveBeenCalledWith(mockExtension);

      // Verify state transition
      const state = app.store.getState();
      expect(selectExtensionState(state, mockExtension.id)).toBe('registered');
    });

    it('should dispatch setExtensionError on failure', async () => {
      const app = createHAI3().use(screensets()).use(effects()).use(microfrontends()).build();
      apps.push(app);

      // Mock runtime method to fail
      const registerExtensionSpy = vi.fn().mockRejectedValue(new Error('Registration failed'));
      app.screensetsRegistry.registerExtension = registerExtensionSpy;

      // Trigger action
      registerExtension(mockExtension);

      // Wait for async effect
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify state shows error
      const state = app.store.getState();
      expect(selectExtensionState(state, mockExtension.id)).toBe('error');
    });
  });

  describe('20.5.3 - unregisterExtension action and effect', () => {
    let eventSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      eventSpy = vi.fn();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should emit unregisterExtensionRequested event', () => {
      const unsub = eventBus.on(MfeEvents.UnregisterExtensionRequested, eventSpy);

      unregisterExtension(mockExtension.id);

      expect(eventSpy).toHaveBeenCalledWith({
        extensionId: mockExtension.id,
      });

      unsub.unsubscribe();
    });

    it('should call runtime.unregisterExtension', async () => {
      const app = createHAI3().use(screensets()).use(effects()).use(microfrontends()).build();
      apps.push(app);

      // Mock runtime method
      const unregisterExtensionSpy = vi.fn().mockResolvedValue(undefined);
      app.screensetsRegistry.unregisterExtension = unregisterExtensionSpy;

      // Trigger action
      unregisterExtension(mockExtension.id);

      // Wait for async effect
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify runtime method was called
      expect(unregisterExtensionSpy).toHaveBeenCalledWith(mockExtension.id);

      // Verify state transition
      const state = app.store.getState();
      expect(selectExtensionState(state, mockExtension.id)).toBe('unregistered');
    });
  });

  describe('20.5.4 - registerDomain action and effect', () => {
    let eventSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      eventSpy = vi.fn();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should emit registerDomainRequested event', () => {
      const unsub = eventBus.on(MfeEvents.RegisterDomainRequested, eventSpy);

      registerDomain(mockDomain);

      expect(eventSpy).toHaveBeenCalledWith({
        domain: mockDomain,
      });

      unsub.unsubscribe();
    });

    it('should call runtime.registerDomain', async () => {
      const app = createHAI3().use(screensets()).use(effects()).use(microfrontends()).build();
      apps.push(app);

      // Mock runtime method
      const registerDomainSpy = vi.fn();
      app.screensetsRegistry.registerDomain = registerDomainSpy;

      // Trigger action
      registerDomain(mockDomain);

      // Wait for async effect
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify runtime method was called
      expect(registerDomainSpy).toHaveBeenCalledWith(mockDomain);
    });
  });

  describe('20.5.5 - unregisterDomain action and effect', () => {
    let eventSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      eventSpy = vi.fn();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should emit unregisterDomainRequested event', () => {
      const unsub = eventBus.on(MfeEvents.UnregisterDomainRequested, eventSpy);

      unregisterDomain(mockDomain.id);

      expect(eventSpy).toHaveBeenCalledWith({
        domainId: mockDomain.id,
      });

      unsub.unsubscribe();
    });

    it('should call runtime.unregisterDomain', async () => {
      const app = createHAI3().use(screensets()).use(effects()).use(microfrontends()).build();
      apps.push(app);

      // Mock runtime method
      const unregisterDomainSpy = vi.fn().mockResolvedValue(undefined);
      app.screensetsRegistry.unregisterDomain = unregisterDomainSpy;

      // Trigger action
      unregisterDomain(mockDomain.id);

      // Wait for async effect
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify runtime method was called
      expect(unregisterDomainSpy).toHaveBeenCalledWith(mockDomain.id);
    });
  });

  describe('20.5.6 - slice state transitions', () => {
    it('should transition through registration states', async () => {
      const app = createHAI3().use(screensets()).use(effects()).use(microfrontends()).build();
      apps.push(app);

      // Mock runtime method with delay
      app.screensetsRegistry.registerExtension = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Register domain first
      app.screensetsRegistry.registerDomain(mockDomain);

      // Initial state
      let state = app.store.getState();
      expect(selectExtensionState(state, mockExtension.id)).toBe('unregistered');

      // Trigger registration
      registerExtension(mockExtension);

      // Wait a bit (registering state)
      await new Promise((resolve) => setTimeout(resolve, 5));
      state = app.store.getState();
      expect(selectExtensionState(state, mockExtension.id)).toBe('registering');

      // Wait for completion (registered state)
      await new Promise((resolve) => setTimeout(resolve, 50));
      state = app.store.getState();
      expect(selectExtensionState(state, mockExtension.id)).toBe('registered');
    });
  });

  describe('20.5.7 - selectExtensionState selector', () => {
    it('should return unregistered for unknown extension', () => {
      const app = createHAI3().use(screensets()).use(effects()).use(microfrontends()).build();
      apps.push(app);
      const state = app.store.getState();

      expect(selectExtensionState(state, 'unknown.extension')).toBe('unregistered');
    });

    it('should return correct state for known extension', async () => {
      const app = createHAI3().use(screensets()).use(effects()).use(microfrontends()).build();
      apps.push(app);

      app.screensetsRegistry.registerExtension = vi.fn().mockResolvedValue(undefined);
      app.screensetsRegistry.registerDomain(mockDomain);

      registerExtension(mockExtension);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const state = app.store.getState();
      expect(selectExtensionState(state, mockExtension.id)).toBe('registered');
    });
  });

  describe('20.5.8 - selectRegisteredExtensions selector', () => {
    it('should return empty array when no extensions registered', () => {
      const app = createHAI3().use(screensets()).use(effects()).use(microfrontends()).build();
      apps.push(app);
      const state = app.store.getState();

      expect(selectRegisteredExtensions(state)).toEqual([]);
    });

    it('should return array of registered extension IDs', async () => {
      const app = createHAI3().use(screensets()).use(effects()).use(microfrontends()).build();
      apps.push(app);

      app.screensetsRegistry.registerExtension = vi.fn().mockResolvedValue(undefined);
      app.screensetsRegistry.registerDomain(mockDomain);

      const ext1 = { ...mockExtension, id: 'gts.hai3.mfes.ext.extension.v1~test.app.test.ext1.v1' };
      const ext2 = { ...mockExtension, id: 'gts.hai3.mfes.ext.extension.v1~test.app.test.ext2.v1' };

      registerExtension(ext1);
      registerExtension(ext2);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const state = app.store.getState();
      const registered = selectRegisteredExtensions(state);

      expect(registered).toContain(ext1.id);
      expect(registered).toContain(ext2.id);
      expect(registered.length).toBe(2);
    });

    it('should not include unregistered or error state extensions', async () => {
      const app = createHAI3().use(screensets()).use(effects()).use(microfrontends()).build();
      apps.push(app);

      app.screensetsRegistry.registerDomain(mockDomain);

      // Mock one success and one failure
      const ext1 = { ...mockExtension, id: 'gts.hai3.mfes.ext.extension.v1~test.app.test.ext1.v1' };
      const ext2 = { ...mockExtension, id: 'gts.hai3.mfes.ext.extension.v1~test.app.test.ext2.v1' };

      let callCount = 0;
      app.screensetsRegistry.registerExtension = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Registration failed');
        }
      });

      registerExtension(ext1);
      registerExtension(ext2);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const state = app.store.getState();
      const registered = selectRegisteredExtensions(state);

      expect(registered).toContain(ext1.id);
      expect(registered).not.toContain(ext2.id);
      expect(registered.length).toBe(1);
    });
  });
});
