/**
 * MFE Slice Mount State Tests - Phase 42
 *
 * Tests for mount/unmount state tracking reducers and selectors.
 *
 * The reducer treats domainId/extensionId as opaque strings, but we use the
 * production-shaped GTS IDs here (rather than toy values like 'screen' or
 * 'home') so tests exercise the same key shapes production code will store.
 *
 * @packageDocumentation
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import {
  mfeSlice,
  setExtensionMounted,
  setExtensionUnmounted,
  selectMountedExtension,
  type MfeState,
} from '../../../src/plugins/microfrontends';

const SCREEN_DOMAIN_ID =
  'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.screen.v1';
const SIDEBAR_DOMAIN_ID =
  'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.sidebar.v1';
const POPUP_DOMAIN_ID =
  'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.popup.v1';

const HOME_EXTENSION_ID =
  'gts.hai3.mfes.ext.extension.v1~test.app.home.v1';
const SETTINGS_EXTENSION_ID =
  'gts.hai3.mfes.ext.extension.v1~test.app.settings.v1';
const ORIGINAL_EXTENSION_ID =
  'gts.hai3.mfes.ext.extension.v1~test.app.original.v1';
const REPLACEMENT_EXTENSION_ID =
  'gts.hai3.mfes.ext.extension.v1~test.app.replacement.v1';

describe('MFE Slice - Mount State', () => {
  describe('42.7.1 - setExtensionMounted reducer', () => {
    it('should update mountedExtensions[domainId] to extensionId', () => {
      const initialState: MfeState = {
        registrationStates: {},
        errors: {},
        mountedExtensions: {},
      };

      const action = setExtensionMounted({
        domainId: SCREEN_DOMAIN_ID,
        extensionId: HOME_EXTENSION_ID,
      });

      const newState = mfeSlice.reducer(initialState, action);

      expect(newState.mountedExtensions[SCREEN_DOMAIN_ID]).toBe(HOME_EXTENSION_ID);
    });

    it('should overwrite existing mounted extension for domain', () => {
      const initialState: MfeState = {
        registrationStates: {},
        errors: {},
        mountedExtensions: {
          [SCREEN_DOMAIN_ID]: ORIGINAL_EXTENSION_ID,
        },
      };

      const action = setExtensionMounted({
        domainId: SCREEN_DOMAIN_ID,
        extensionId: REPLACEMENT_EXTENSION_ID,
      });

      const newState = mfeSlice.reducer(initialState, action);

      expect(newState.mountedExtensions[SCREEN_DOMAIN_ID]).toBe(REPLACEMENT_EXTENSION_ID);
    });
  });

  describe('42.7.2 - setExtensionUnmounted reducer', () => {
    it('should set mountedExtensions[domainId] to undefined', () => {
      const initialState: MfeState = {
        registrationStates: {},
        errors: {},
        mountedExtensions: {
          [SCREEN_DOMAIN_ID]: HOME_EXTENSION_ID,
        },
      };

      const action = setExtensionUnmounted({
        domainId: SCREEN_DOMAIN_ID,
      });

      const newState = mfeSlice.reducer(initialState, action);

      expect(newState.mountedExtensions[SCREEN_DOMAIN_ID]).toBeUndefined();
    });

    it('should be idempotent when domain has no mounted extension', () => {
      const initialState: MfeState = {
        registrationStates: {},
        errors: {},
        mountedExtensions: {},
      };

      const action = setExtensionUnmounted({
        domainId: SCREEN_DOMAIN_ID,
      });

      const newState = mfeSlice.reducer(initialState, action);

      expect(newState.mountedExtensions[SCREEN_DOMAIN_ID]).toBeUndefined();
    });
  });

  describe('42.7.3 - selectMountedExtension returns extensionId for mounted domain', () => {
    it('should return the correct extensionId for a mounted domain', () => {
      const state = {
        mfe: {
          registrationStates: {},
          errors: {},
          mountedExtensions: {
            [SCREEN_DOMAIN_ID]: HOME_EXTENSION_ID,
            [SIDEBAR_DOMAIN_ID]: SETTINGS_EXTENSION_ID,
          },
        },
      };

      expect(selectMountedExtension(state, SCREEN_DOMAIN_ID)).toBe(HOME_EXTENSION_ID);
      expect(selectMountedExtension(state, SIDEBAR_DOMAIN_ID)).toBe(SETTINGS_EXTENSION_ID);
    });
  });

  describe('42.7.4 - selectMountedExtension returns undefined for unmounted domain', () => {
    it('should return undefined for a domain with no mounted extension', () => {
      const state = {
        mfe: {
          registrationStates: {},
          errors: {},
          mountedExtensions: {
            [SCREEN_DOMAIN_ID]: HOME_EXTENSION_ID,
          },
        },
      };

      expect(selectMountedExtension(state, POPUP_DOMAIN_ID)).toBeUndefined();
    });

    it('should return undefined for a domain that was unmounted', () => {
      const state = {
        mfe: {
          registrationStates: {},
          errors: {},
          mountedExtensions: {
            [SCREEN_DOMAIN_ID]: undefined,
          },
        },
      };

      expect(selectMountedExtension(state, SCREEN_DOMAIN_ID)).toBeUndefined();
    });
  });
});
