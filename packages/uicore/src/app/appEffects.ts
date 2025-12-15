/**
 * App Effects - Side effects for application-level state
 * Subscribes to user and API events, updates app slice
 * Implements Flux pattern: Event -> Effect -> Slice Update
 *
 * Pattern: 1 slice = 1 effects file
 * All events that update appSlice are handled here
 */

import type { Store } from '@reduxjs/toolkit';
import { eventBus } from '../core/events/eventBus';
import { UserEvents } from '../core/events/eventTypes/userEvents';
import { ApiEvents } from '../core/events/eventTypes/apiEvents';
import { I18nEvents } from '../core/events/eventTypes/i18nEvents';
import { ScreensetEvents } from '../core/events/eventTypes/screensetEvents';
import { TenantEvents } from '../core/events/eventTypes/tenantEvents';
import { setUser, setError, setLoading, setUseMockApi, setLanguage, setTranslationsReady, setTenant } from './appSlice';
import { i18nRegistry } from '../i18n/i18nRegistry';
import { apiRegistry } from '../api/apiRegistry';

/**
 * Initialize app effects
 * Call this once during app setup
 */
export function initAppEffects(store: Store): void {
  // Note: Mock mode is initialized in apiRegistry.initialize() in main.tsx
  // This ensures services are instantiated before plugins are registered

  // User fetch started - set loading state
  eventBus.on(UserEvents.FetchStarted, () => {
    store.dispatch(setLoading(true));
  });

  // User fetch succeeded - update user and clear loading/error
  eventBus.on(UserEvents.Fetched, ({ user }) => {
    store.dispatch(setUser(user));
    store.dispatch(setError(null));
    store.dispatch(setLoading(false));
  });

  // User fetch failed - set error and clear loading
  eventBus.on(UserEvents.FetchFailed, ({ error }) => {
    store.dispatch(setError(error.message));
    store.dispatch(setLoading(false));
  });

  // API configuration events
  eventBus.on(ApiEvents.ModeChanged, ({ useMockApi }) => {
    store.dispatch(setUseMockApi(useMockApi));
    // Reinitialize all API services with new mock mode
    apiRegistry.setMockMode(useMockApi);
  });

  // i18n events
  eventBus.on(I18nEvents.LanguageChanged, async ({ language }) => {
    const state = store.getState().uicore.app;
    const currentLanguage = state.language;
    const translationsReady = state.translationsReady;

    // Skip reload only if language hasn't changed AND translations are already ready
    // This allows initial load even when language is the same (e.g., both English)
    // Prevents unnecessary reloads when navigating to profile screen after initial load
    if (currentLanguage === language && translationsReady) {
      return;
    }

    // Mark translations as not ready while loading
    store.dispatch(setTranslationsReady(false));

    // Update Redux store
    store.dispatch(setLanguage(language));

    // Update i18nRegistry (sets HTML attributes, loads core translations)
    await i18nRegistry.setLanguage(language);

    // Load translations for the currently active screenset (lazy loading)
    const currentScreenset = store.getState().uicore.layout.currentScreenset;
    if (currentScreenset) {
      // Extract screenset ID from format "category:screensetId"
      const screensetId = currentScreenset.includes(':')
        ? currentScreenset.split(':')[1]
        : currentScreenset;
      await i18nRegistry.loadScreensetTranslations(screensetId, language);
    }

    // Mark translations as ready after loading
    store.dispatch(setTranslationsReady(true));
  });

  // Tenant events
  eventBus.on(TenantEvents.Changed, ({ tenant }) => {
    store.dispatch(setTenant(tenant));
  });

  // Screenset change events - load translations for newly selected screenset
  eventBus.on(ScreensetEvents.Changed, async ({ screensetId }) => {
    const currentScreenset = store.getState().uicore.layout.currentScreenset;

    // Only load if screenset actually changed
    if (currentScreenset !== screensetId) {
      // Extract screenset ID from format "category:screensetId"
      const id = screensetId.includes(':')
        ? screensetId.split(':')[1]
        : screensetId;
      await i18nRegistry.loadScreensetTranslations(id);
    }
  });
}
