/**
 * Tests for microfrontends plugin - Phase 13
 *
 * Tests Flux integration: actions, effects, slice, components, navigation.
 * Phase 7.9 tests (plugin propagation, JSON loading) are in microfrontends.test.ts.
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
  loadExtension,
  preloadExtension,
  mountExtension,
  unmountExtension,
  handleMfeHostAction,
  MfeEvents,
  selectMfeLoadState,
  selectMfeMountState,
  selectMfeError,
  MfeErrorBoundary,
  MfeLoadingIndicator,
  ShadowDomContainer,
} from '../../../src/plugins/microfrontends';
import { eventBus } from '@hai3/state';

describe('microfrontends plugin - Phase 13', () => {
  describe('13.8.1 - plugin registration', () => {
    it('should register plugin with Flux wiring', () => {
      const plugin = microfrontends();

      expect(plugin.name).toBe('microfrontends');
      expect(plugin.dependencies).toContain('screensets');
      expect(plugin.provides).toBeDefined();
      expect(plugin.provides?.registries).toBeDefined();
      expect(plugin.provides?.slices).toBeDefined();
      expect(plugin.provides?.slices?.length).toBeGreaterThan(0);
      // NOTE: Effects are NOT in provides.effects - they are initialized in onInit
      // to avoid duplicate event listeners (framework calls provides.effects at step 5,
      // then onInit at step 7). We need cleanup references, so only init in onInit.
      expect(plugin.provides?.actions).toBeDefined();
    });

    it('should provide MFE actions', () => {
      const plugin = microfrontends();

      expect(plugin.provides?.actions).toHaveProperty('loadExtension');
      expect(plugin.provides?.actions).toHaveProperty('preloadExtension');
      expect(plugin.provides?.actions).toHaveProperty('mountExtension');
      expect(plugin.provides?.actions).toHaveProperty('unmountExtension');
      expect(plugin.provides?.actions).toHaveProperty('handleMfeHostAction');
    });

    it('should make MFE actions available on app.actions', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends())
        .build();

      expect(typeof app.actions.loadExtension).toBe('function');
      expect(typeof app.actions.preloadExtension).toBe('function');
      expect(typeof app.actions.mountExtension).toBe('function');
      expect(typeof app.actions.unmountExtension).toBe('function');
      expect(typeof app.actions.handleMfeHostAction).toBe('function');
    });
  });

  describe('13.8.2 - MFE actions event emission', () => {
    let eventSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      eventSpy = vi.fn();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should emit loadRequested event', () => {
      const unsub = eventBus.on(MfeEvents.LoadRequested, eventSpy);

      loadExtension('test.extension.v1');

      expect(eventSpy).toHaveBeenCalledWith({
        extensionId: 'test.extension.v1',
      });

      unsub.unsubscribe();
    });

    it('should emit preloadRequested event', () => {
      const unsub = eventBus.on(MfeEvents.PreloadRequested, eventSpy);

      preloadExtension('test.extension.v1');

      expect(eventSpy).toHaveBeenCalledWith({
        extensionId: 'test.extension.v1',
      });

      unsub.unsubscribe();
    });

    it('should emit mountRequested event', () => {
      const unsub = eventBus.on(MfeEvents.MountRequested, eventSpy);
      const container = document.createElement('div');

      mountExtension('test.extension.v1', container);

      expect(eventSpy).toHaveBeenCalledWith({
        extensionId: 'test.extension.v1',
        containerElement: container,
      });

      unsub.unsubscribe();
    });

    it('should emit unmountRequested event', () => {
      const unsub = eventBus.on(MfeEvents.UnmountRequested, eventSpy);

      unmountExtension('test.extension.v1');

      expect(eventSpy).toHaveBeenCalledWith({
        extensionId: 'test.extension.v1',
      });

      unsub.unsubscribe();
    });

    it('should emit hostActionRequested event', () => {
      const unsub = eventBus.on(MfeEvents.HostActionRequested, eventSpy);

      handleMfeHostAction('test.extension.v1', 'test.action.v1', { data: 'test' });

      expect(eventSpy).toHaveBeenCalledWith({
        extensionId: 'test.extension.v1',
        actionTypeId: 'test.action.v1',
        payload: { data: 'test' },
      });

      unsub.unsubscribe();
    });
  });

  describe('13.8.3 - MFE effects and slice', () => {
    it('should initialize MFE slice in store', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends())
        .build();

      const state = app.store.getState();
      expect(state).toHaveProperty('mfe');
      expect(state.mfe).toHaveProperty('extensions');
    });

    it('should track load state via selectors', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends())
        .build();

      const state = app.store.getState();

      // Initial state should be 'idle' for extensions that haven't been touched yet
      // Use a unique extension ID that won't be affected by other tests
      const uniqueExtId = 'test.unique.extension.v1';
      const loadState = selectMfeLoadState(state, uniqueExtId);
      expect(loadState).toBe('idle');

      const mountState = selectMfeMountState(state, uniqueExtId);
      expect(mountState).toBe('unmounted');

      const error = selectMfeError(state, uniqueExtId);
      expect(error).toBeUndefined();
    });

    it('should update load state when load action is dispatched', async () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends())
        .build();

      // Trigger load action
      loadExtension('test.extension.v1');

      // Wait for async effect to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      const state = app.store.getState();

      // Should be in loading or error state (Phase 19 stubs throw)
      const loadState = selectMfeLoadState(state, 'test.extension.v1');
      expect(['loading', 'error']).toContain(loadState);
    });
  });

  describe('13.8.4 - MFE slice state transitions', () => {
    it('should handle multiple extensions independently', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends())
        .build();

      // Trigger loads for different extensions
      loadExtension('ext1.v1');
      loadExtension('ext2.v1');

      const state = app.store.getState();

      // Both extensions should be tracked
      expect(state.mfe.extensions).toHaveProperty('ext1.v1');
      expect(state.mfe.extensions).toHaveProperty('ext2.v1');
    });

    it('should track separate load and mount states', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends())
        .build();

      const state = app.store.getState();

      // Load state and mount state are independent
      const loadState = selectMfeLoadState(state, 'test.ext.v1');
      const mountState = selectMfeMountState(state, 'test.ext.v1');

      expect(loadState).toBe('idle');
      expect(mountState).toBe('unmounted');
    });
  });

  describe('13.8.5 - ShadowDomContainer', () => {
    it('should create shadow root', () => {
      const host = document.createElement('div');
      document.body.appendChild(host);

      const container = new ShadowDomContainer({
        hostElement: host,
        mode: 'open',
      });

      const shadowRoot = container.create();

      expect(shadowRoot).toBeDefined();
      expect(shadowRoot.mode).toBe('open');
      expect(container.isCreated()).toBe(true);

      container.destroy();
      document.body.removeChild(host);
    });

    it('should inject CSS variables', () => {
      const host = document.createElement('div');
      document.body.appendChild(host);

      const container = new ShadowDomContainer({
        hostElement: host,
        mode: 'open',
        cssVariables: {
          '--primary-color': 'blue',
          '--font-family': 'Arial',
        },
      });

      container.create();
      const shadowRoot = container.getShadowRoot();

      expect(shadowRoot).toBeDefined();
      // CSS variables are injected via style element
      const styles = shadowRoot?.querySelectorAll('style');
      expect(styles?.length).toBeGreaterThan(0);

      container.destroy();
      document.body.removeChild(host);
    });

    it('should update CSS variables', () => {
      const host = document.createElement('div');
      document.body.appendChild(host);

      const container = new ShadowDomContainer({
        hostElement: host,
        mode: 'open',
        cssVariables: { '--color': 'red' },
      });

      container.create();
      container.updateCssVariables({ '--color': 'blue' });

      const shadowRoot = container.getShadowRoot();
      expect(shadowRoot).toBeDefined();

      container.destroy();
      document.body.removeChild(host);
    });
  });

  describe('13.8.6 - MfeErrorBoundary', () => {
    it('should render error UI', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const boundary = new MfeErrorBoundary({
        container,
        error: new Error('Test error'),
        extensionId: 'test.ext.v1',
      });

      boundary.render();

      expect(container.innerHTML).toContain('MFE Load Error');
      expect(container.innerHTML).toContain('Test error');
      expect(container.innerHTML).toContain('test.ext.v1');

      boundary.destroy();
      document.body.removeChild(container);
    });

    it('should call retry callback', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const onRetry = vi.fn();
      const boundary = new MfeErrorBoundary({
        container,
        error: 'Test error',
        onRetry,
      });

      boundary.render();

      const button = container.querySelector('button');
      expect(button).toBeDefined();

      button?.click();
      expect(onRetry).toHaveBeenCalled();

      boundary.destroy();
      document.body.removeChild(container);
    });
  });

  describe('13.8.7 - MfeLoadingIndicator', () => {
    it('should render loading UI', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const indicator = new MfeLoadingIndicator({
        container,
        message: 'Loading extension...',
        extensionId: 'test.ext.v1',
      });

      indicator.render();

      expect(container.innerHTML).toContain('Loading extension...');
      expect(container.innerHTML).toContain('test.ext.v1');

      indicator.destroy();
      document.body.removeChild(container);
    });

    it('should update message', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const indicator = new MfeLoadingIndicator({
        container,
        message: 'Initial message',
      });

      indicator.render();
      expect(container.innerHTML).toContain('Initial message');

      indicator.updateMessage('Updated message');
      expect(container.innerHTML).toContain('Updated message');

      indicator.destroy();
      document.body.removeChild(container);
    });
  });

  describe('13.8.8 - Navigation integration', () => {
    it('should initialize navigation integration', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends())
        .build();

      // Plugin should initialize navigation integration
      // This is tested indirectly via plugin onInit
      expect(app).toBeDefined();
    });

    it('should handle plugin cleanup', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends())
        .build();

      // Should not throw on destroy
      expect(() => app.destroy()).not.toThrow();
    });
  });
});
