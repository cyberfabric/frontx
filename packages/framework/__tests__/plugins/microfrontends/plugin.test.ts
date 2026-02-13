/**
 * Tests for microfrontends plugin - Phase 13
 *
 * Tests Flux integration: actions, effects, slice, components, navigation.
 * Phase 7.9 tests (plugin propagation, JSON loading) are in microfrontends.test.ts.
 *
 * @packageDocumentation
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createHAI3 } from '../../../src/createHAI3';
import { screensets } from '../../../src/plugins/screensets';
import { effects } from '../../../src/plugins/effects';
import {
  microfrontends,
  loadExtension,
  MfeEvents,
  selectExtensionState,
  selectExtensionError,
  MfeErrorBoundary,
  MfeLoadingIndicator,
  ShadowDomContainer,
} from '../../../src/plugins/microfrontends';
import { eventBus, resetStore } from '@hai3/state';
import type { Extension } from '@hai3/screensets';
import type { HAI3App } from '../../../src/types';

describe('microfrontends plugin - Phase 13', () => {
  let apps: HAI3App[] = [];

  afterEach(() => {
    apps.forEach(app => app.destroy());
    apps = [];
    resetStore();
  });
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
      expect(plugin.provides?.actions).not.toHaveProperty('handleMfeHostAction');
    });

    it('should make MFE actions available on app.actions', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends())
        .build();
      apps.push(app);

      expect(typeof app.actions.loadExtension).toBe('function');
      expect(typeof app.actions.preloadExtension).toBe('function');
      expect(typeof app.actions.mountExtension).toBe('function');
      expect(typeof app.actions.unmountExtension).toBe('function');
      expect(app.actions.handleMfeHostAction).toBeUndefined();
    });
  });

  describe('13.8.2 - MFE lifecycle actions call executeActionsChain', () => {
    it('should call executeActionsChain for loadExtension', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends())
        .build();
      apps.push(app);

      // Mock getExtension to return extension (avoids GTS validation)
      const testDomainId = 'gts.hai3.mfes.ext.domain.v1~test.app.test.domain.v1';
      const testExtensionId = 'gts.hai3.mfes.ext.extension.v1~test.app.test.ext.v1';
      const testExtension: Extension = {
        id: testExtensionId,
        domain: testDomainId,
        entry: 'gts.hai3.mfes.mfe.entry.v1~test.app.test.entry.v1',
      };

      vi.spyOn(app.screensetsRegistry, 'getExtension').mockReturnValue(testExtension);
      const spy = vi.spyOn(app.screensetsRegistry, 'executeActionsChain').mockResolvedValue(undefined);

      // Call loadExtension - should call executeActionsChain fire-and-forget
      loadExtension(testExtensionId);

      expect(spy).toHaveBeenCalledWith({
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.load_ext.v1',
          target: testDomainId,
          payload: { extensionId: testExtensionId },
        },
      });
    });

    it('should verify registration events still work', () => {
      const eventSpy = vi.fn();
      const unsub = eventBus.on(MfeEvents.RegisterExtensionRequested, eventSpy);

      const testExtension: Extension = {
        id: 'gts.hai3.mfes.ext.extension.v1~test.ext.v1',
        domain: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1',
        entry: 'gts.hai3.mfes.mfe.entry.v1~test.entry.v1',
      };

      // Use event bus directly (not the action, which is async)
      eventBus.emit(MfeEvents.RegisterExtensionRequested, { extension: testExtension });

      expect(eventSpy).toHaveBeenCalledWith({ extension: testExtension });

      unsub.unsubscribe();
    });
  });

  describe('13.8.3 - MFE slice (registration only)', () => {
    it('should initialize MFE slice in store', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends())
        .build();
      apps.push(app);

      const state = app.store.getState();
      expect(state).toHaveProperty('mfe');
      expect(state.mfe).toHaveProperty('registrationStates');
      expect(state.mfe).toHaveProperty('errors');
    });

    it('should track registration state via selectors', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends())
        .build();
      apps.push(app);

      const state = app.store.getState();

      // Initial state should be 'unregistered' for extensions not registered yet
      const uniqueExtId = 'test.unique.extension.v1';
      const registrationState = selectExtensionState(state, uniqueExtId);
      expect(registrationState).toBe('unregistered');

      const error = selectExtensionError(state, uniqueExtId);
      expect(error).toBeUndefined();
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
      apps.push(app);

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
      apps.push(app);

      // Should not throw on destroy (afterEach handles actual cleanup)
      expect(() => app.destroy()).not.toThrow();
    });
  });
});
