/**
 * Tests for theme and language propagation - Phase 43
 *
 * Tests that theme/changed and i18n/language/changed events propagate
 * to domain properties on all 4 base domains.
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
  HAI3_SCREEN_DOMAIN,
  HAI3_SIDEBAR_DOMAIN,
  HAI3_POPUP_DOMAIN,
  HAI3_OVERLAY_DOMAIN,
} from '../../../src/plugins/microfrontends';
import { eventBus, resetStore } from '@hai3/state';
import { HAI3_SHARED_PROPERTY_THEME, HAI3_SHARED_PROPERTY_LANGUAGE } from '@hai3/screensets';
import type { HAI3App } from '../../../src/types';

describe('Theme and Language Propagation - Phase 43', () => {
  let apps: HAI3App[] = [];

  afterEach(() => {
    apps.forEach(app => app.destroy());
    apps = [];
    resetStore();
  });

  describe('43.4.1: theme/changed event propagates theme ID to all 4 domains', () => {
    it('should call updateDomainProperty 4 times with correct arguments', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends())
        .build();
      apps.push(app);

      const updateSpy = vi.spyOn(app.screensetsRegistry, 'updateDomainProperty');

      // Emit theme/changed event
      eventBus.emit('theme/changed', { themeId: 'dark' });

      // Should be called 4 times (once per domain)
      expect(updateSpy).toHaveBeenCalledTimes(4);

      // Verify each domain was called with correct arguments
      expect(updateSpy).toHaveBeenCalledWith(HAI3_SCREEN_DOMAIN, HAI3_SHARED_PROPERTY_THEME, 'dark');
      expect(updateSpy).toHaveBeenCalledWith(HAI3_SIDEBAR_DOMAIN, HAI3_SHARED_PROPERTY_THEME, 'dark');
      expect(updateSpy).toHaveBeenCalledWith(HAI3_POPUP_DOMAIN, HAI3_SHARED_PROPERTY_THEME, 'dark');
      expect(updateSpy).toHaveBeenCalledWith(HAI3_OVERLAY_DOMAIN, HAI3_SHARED_PROPERTY_THEME, 'dark');
    });
  });

  describe('43.4.2: i18n/language/changed event propagates language code to all 4 domains', () => {
    it('should call updateDomainProperty 4 times with correct arguments', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends())
        .build();
      apps.push(app);

      const updateSpy = vi.spyOn(app.screensetsRegistry, 'updateDomainProperty');
      updateSpy.mockClear(); // Clear any calls from initialization

      // Emit i18n/language/changed event
      eventBus.emit('i18n/language/changed', { language: 'de' });

      // Should be called 4 times (once per domain)
      expect(updateSpy).toHaveBeenCalledTimes(4);

      // Verify each domain was called with correct arguments
      expect(updateSpy).toHaveBeenCalledWith(HAI3_SCREEN_DOMAIN, HAI3_SHARED_PROPERTY_LANGUAGE, 'de');
      expect(updateSpy).toHaveBeenCalledWith(HAI3_SIDEBAR_DOMAIN, HAI3_SHARED_PROPERTY_LANGUAGE, 'de');
      expect(updateSpy).toHaveBeenCalledWith(HAI3_POPUP_DOMAIN, HAI3_SHARED_PROPERTY_LANGUAGE, 'de');
      expect(updateSpy).toHaveBeenCalledWith(HAI3_OVERLAY_DOMAIN, HAI3_SHARED_PROPERTY_LANGUAGE, 'de');
    });
  });

  describe('43.4.3: propagation silently skips unregistered domains', () => {
    it('should attempt all 4 domains and not throw errors', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends())
        .build();
      apps.push(app);

      // Mock updateDomainProperty to throw for 2 domains (simulating unregistered domains)
      const updateSpy = vi.spyOn(app.screensetsRegistry, 'updateDomainProperty')
        .mockImplementation((domainId: string, _propertyTypeId: string, _value: unknown) => {
          if (domainId === HAI3_SIDEBAR_DOMAIN || domainId === HAI3_OVERLAY_DOMAIN) {
            throw new Error('Domain not registered');
          }
        });
      updateSpy.mockClear(); // Clear any calls from initialization

      // Emit theme/changed event - should not throw
      expect(() => {
        eventBus.emit('theme/changed', { themeId: 'light' });
      }).not.toThrow();

      // Should be called 4 times (all domains attempted)
      expect(updateSpy).toHaveBeenCalledTimes(4);

      // Verify successful calls for screen and popup
      expect(updateSpy).toHaveBeenCalledWith(HAI3_SCREEN_DOMAIN, HAI3_SHARED_PROPERTY_THEME, 'light');
      expect(updateSpy).toHaveBeenCalledWith(HAI3_POPUP_DOMAIN, HAI3_SHARED_PROPERTY_THEME, 'light');

      // Verify attempted calls for sidebar and overlay (even though they threw)
      expect(updateSpy).toHaveBeenCalledWith(HAI3_SIDEBAR_DOMAIN, HAI3_SHARED_PROPERTY_THEME, 'light');
      expect(updateSpy).toHaveBeenCalledWith(HAI3_OVERLAY_DOMAIN, HAI3_SHARED_PROPERTY_THEME, 'light');
    });
  });

  describe('43.4.4: propagation cleanup unsubscribes on destroy', () => {
    it('should not call updateDomainProperty after app destroy', () => {
      const app = createHAI3()
        .use(screensets())
        .use(effects())
        .use(microfrontends())
        .build();

      const updateSpy = vi.spyOn(app.screensetsRegistry, 'updateDomainProperty');

      // Destroy the app (should unsubscribe from events)
      app.destroy();
      apps = []; // Already destroyed

      // Clear spy calls from any cleanup operations
      updateSpy.mockClear();

      // Emit events after destroy
      eventBus.emit('theme/changed', { themeId: 'dark' });
      eventBus.emit('i18n/language/changed', { language: 'es' });

      // Should NOT be called (listeners were removed)
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });
});
