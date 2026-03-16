/**
 * MFE Slice Mount State Tests - Phase 42
 *
 * Tests for mount/unmount state tracking reducers and selectors.
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

describe('MFE Slice - Mount State', () => {
  describe('42.7.1 - setExtensionMounted reducer', () => {
    it('should update mountedExtensions[domainId] to extensionId', () => {
      const initialState: MfeState = {
        registrationStates: {},
        errors: {},
        mountedExtensions: {},
      };

      const action = setExtensionMounted({
        domainId: 'screen',
        extensionId: 'home',
      });

      const newState = mfeSlice.reducer(initialState, action);

      expect(newState.mountedExtensions['screen']).toBe('home');
    });

    it('should overwrite existing mounted extension for domain', () => {
      const initialState: MfeState = {
        registrationStates: {},
        errors: {},
        mountedExtensions: {
          screen: 'old-extension',
        },
      };

      const action = setExtensionMounted({
        domainId: 'screen',
        extensionId: 'new-extension',
      });

      const newState = mfeSlice.reducer(initialState, action);

      expect(newState.mountedExtensions['screen']).toBe('new-extension');
    });
  });

  describe('42.7.2 - setExtensionUnmounted reducer', () => {
    it('should set mountedExtensions[domainId] to undefined', () => {
      const initialState: MfeState = {
        registrationStates: {},
        errors: {},
        mountedExtensions: {
          screen: 'home',
        },
      };

      const action = setExtensionUnmounted({
        domainId: 'screen',
      });

      const newState = mfeSlice.reducer(initialState, action);

      expect(newState.mountedExtensions['screen']).toBeUndefined();
    });

    it('should be idempotent when domain has no mounted extension', () => {
      const initialState: MfeState = {
        registrationStates: {},
        errors: {},
        mountedExtensions: {},
      };

      const action = setExtensionUnmounted({
        domainId: 'screen',
      });

      const newState = mfeSlice.reducer(initialState, action);

      expect(newState.mountedExtensions['screen']).toBeUndefined();
    });
  });

  describe('42.7.3 - selectMountedExtension returns extensionId for mounted domain', () => {
    it('should return the correct extensionId for a mounted domain', () => {
      const state = {
        mfe: {
          registrationStates: {},
          errors: {},
          mountedExtensions: {
            screen: 'home',
            sidebar: 'settings',
          },
        },
      };

      const screenExtension = selectMountedExtension(state, 'screen');
      const sidebarExtension = selectMountedExtension(state, 'sidebar');

      expect(screenExtension).toBe('home');
      expect(sidebarExtension).toBe('settings');
    });
  });

  describe('42.7.4 - selectMountedExtension returns undefined for unmounted domain', () => {
    it('should return undefined for a domain with no mounted extension', () => {
      const state = {
        mfe: {
          registrationStates: {},
          errors: {},
          mountedExtensions: {
            screen: 'home',
          },
        },
      };

      const popupExtension = selectMountedExtension(state, 'popup');

      expect(popupExtension).toBeUndefined();
    });

    it('should return undefined for a domain that was unmounted', () => {
      const state = {
        mfe: {
          registrationStates: {},
          errors: {},
          mountedExtensions: {
            screen: undefined,
          },
        },
      };

      const screenExtension = selectMountedExtension(state, 'screen');

      expect(screenExtension).toBeUndefined();
    });
  });
});
