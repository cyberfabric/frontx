/**
 * Tests for Runtime Property Value Validation in updateSharedProperty
 *
 * Verifies:
 * - Valid property values pass GTS schema validation
 * - Invalid property values are rejected with an error
 * - Validation uses the named instance pattern: register({ id, value })
 *   where `id` is a chained GTS instance ID (same pattern as actions chains)
 *   and the schema is extracted automatically from the chained ID — no `type` field
 * - Re-registration with the same deterministic ephemeralId overwrites the previous
 *   instance (no store accumulation)
 * - Validation occurs once per call (before any domain receives the value)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefaultScreensetsRegistry } from '../../../src/mfe/runtime/DefaultScreensetsRegistry';
import { GtsPlugin } from '../../../src/mfe/plugins/gts/index';
import { HAI3_SHARED_PROPERTY_THEME, HAI3_SHARED_PROPERTY_LANGUAGE } from '../../../src/mfe/constants';
import type { ExtensionDomain } from '../../../src/mfe/types';
import { MockContainerProvider } from '../test-utils';

describe('updateSharedProperty - GTS runtime validation', () => {
  let registry: DefaultScreensetsRegistry;
  let gtsPlugin: GtsPlugin;
  let testDomain: ExtensionDomain;
  let mockContainerProvider: MockContainerProvider;

  const DOMAIN_ID = 'gts.hai3.mfes.ext.domain.v1~hai3.test.validation.slot.v1';

  beforeEach(() => {
    gtsPlugin = new GtsPlugin();
    registry = new DefaultScreensetsRegistry({ typeSystem: gtsPlugin });
    mockContainerProvider = new MockContainerProvider();

    testDomain = {
      id: DOMAIN_ID,
      sharedProperties: [HAI3_SHARED_PROPERTY_THEME, HAI3_SHARED_PROPERTY_LANGUAGE],
      actions: [],
      extensionsActions: [],
      defaultActionTimeout: 5000,
      lifecycleStages: [
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
      ],
      extensionsLifecycleStages: [
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
      ],
    };

    registry.registerDomain(testDomain, mockContainerProvider);
  });

  describe('theme property validation', () => {
    it('valid theme value "dark" passes validation and is stored', () => {
      expect(() => {
        registry.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, 'dark');
      }).not.toThrow();

      expect(registry.getDomainProperty(DOMAIN_ID, HAI3_SHARED_PROPERTY_THEME)).toBe('dark');
    });

    it('valid theme value "default" passes validation', () => {
      expect(() => {
        registry.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, 'default');
      }).not.toThrow();
    });

    it('valid theme value "light" passes validation', () => {
      expect(() => {
        registry.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, 'light');
      }).not.toThrow();
    });

    it('invalid theme value "neon" throws validation error', () => {
      expect(() => {
        registry.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, 'neon');
      }).toThrow(/failed validation/);
    });

    it('invalid theme value throws and does NOT store the value', () => {
      // Set a valid value first
      registry.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, 'dark');

      // Attempt to set invalid value
      expect(() => {
        registry.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, 'invalid-theme');
      }).toThrow();

      // Previous valid value should still be stored
      expect(registry.getDomainProperty(DOMAIN_ID, HAI3_SHARED_PROPERTY_THEME)).toBe('dark');
    });
  });

  describe('language property validation', () => {
    it('valid language value "en" passes validation and is stored', () => {
      expect(() => {
        registry.updateSharedProperty(HAI3_SHARED_PROPERTY_LANGUAGE, 'en');
      }).not.toThrow();

      expect(registry.getDomainProperty(DOMAIN_ID, HAI3_SHARED_PROPERTY_LANGUAGE)).toBe('en');
    });

    it('valid language value "fr" passes validation', () => {
      expect(() => {
        registry.updateSharedProperty(HAI3_SHARED_PROPERTY_LANGUAGE, 'fr');
      }).not.toThrow();
    });

    it('invalid language value "klingon" throws validation error', () => {
      expect(() => {
        registry.updateSharedProperty(HAI3_SHARED_PROPERTY_LANGUAGE, 'klingon');
      }).toThrow(/failed validation/);
    });

    it('invalid language value does NOT store the value', () => {
      registry.updateSharedProperty(HAI3_SHARED_PROPERTY_LANGUAGE, 'en');

      expect(() => {
        registry.updateSharedProperty(HAI3_SHARED_PROPERTY_LANGUAGE, 'invalid-lang');
      }).toThrow();

      expect(registry.getDomainProperty(DOMAIN_ID, HAI3_SHARED_PROPERTY_LANGUAGE)).toBe('en');
    });
  });

  describe('ephemeral instance re-registration', () => {
    it('multiple valid updates overwrite the previous ephemeral instance', () => {
      registry.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, 'dark');
      registry.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, 'light');
      registry.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, 'default');

      // Latest value should be stored
      expect(registry.getDomainProperty(DOMAIN_ID, HAI3_SHARED_PROPERTY_THEME)).toBe('default');
    });
  });

  describe('named instance pattern — register() call shape', () => {
    it('calls register() with named instance: chained GTS ID, no type field, value only', () => {
      const registerSpy = vi.spyOn(gtsPlugin, 'register');

      registry.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, 'dark');

      // The register call must use the named instance pattern:
      // - id: chained GTS instance ID (schema extracted automatically by gts-ts)
      // - value: the raw value
      // - NO type field
      expect(registerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `${HAI3_SHARED_PROPERTY_THEME}hai3.mfes.comm.runtime.v1`,
          value: 'dark',
        })
      );

      // Confirm no `type` field is present
      const callArg = registerSpy.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callArg).not.toHaveProperty('type');

      registerSpy.mockRestore();
    });

    it('calls register() with named instance for language property', () => {
      const registerSpy = vi.spyOn(gtsPlugin, 'register');

      registry.updateSharedProperty(HAI3_SHARED_PROPERTY_LANGUAGE, 'en');

      expect(registerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `${HAI3_SHARED_PROPERTY_LANGUAGE}hai3.mfes.comm.runtime.v1`,
          value: 'en',
        })
      );

      // Confirm no `type` field is present
      const callArg = registerSpy.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callArg).not.toHaveProperty('type');

      registerSpy.mockRestore();
    });

    it('ephemeral id encodes schema info as a chained GTS instance ID', () => {
      const registerSpy = vi.spyOn(gtsPlugin, 'register');

      registry.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, 'dark');

      const callArg = registerSpy.mock.calls[0]?.[0] as Record<string, unknown>;
      // The id must use the named instance suffix "hai3.mfes.comm.runtime.v1"
      expect(String(callArg.id)).toContain('hai3.mfes.comm.runtime.v1');
      // The id must NOT use the old anonymous instance suffix "__runtime"
      expect(String(callArg.id)).not.toMatch(/__runtime$/);

      registerSpy.mockRestore();
    });

    it('validation is performed once per call even with multiple declaring domains', () => {
      // Register a second domain that also declares theme
      const domain2: ExtensionDomain = {
        id: 'gts.hai3.mfes.ext.domain.v1~hai3.test.validation2.slot.v1',
        sharedProperties: [HAI3_SHARED_PROPERTY_THEME],
        actions: [],
        extensionsActions: [],
        defaultActionTimeout: 5000,
        lifecycleStages: [
          'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
        ],
        extensionsLifecycleStages: [
          'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
        ],
      };
      registry.registerDomain(domain2, mockContainerProvider);

      const validateSpy = vi.spyOn(gtsPlugin, 'validateInstance');

      registry.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, 'dark');

      // validateInstance should be called exactly once — not once per matching domain
      const validationCallsForTheme = validateSpy.mock.calls.filter(
        ([id]) => String(id).includes('hai3.mfes.comm.runtime.v1')
      );
      expect(validationCallsForTheme).toHaveLength(1);

      validateSpy.mockRestore();
    });
  });
});
