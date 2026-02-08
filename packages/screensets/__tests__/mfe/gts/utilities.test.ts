/**
 * GTS Utilities Tests
 *
 * Tests for HAI3 constants.
 */

import { describe, it, expect } from 'vitest';
import {
  HAI3_MFE_ENTRY,
  HAI3_MFE_ENTRY_MF,
  HAI3_MF_MANIFEST,
  HAI3_EXT_DOMAIN,
  HAI3_EXT_EXTENSION,
  HAI3_EXT_ACTION,
  HAI3_ACTION_LOAD_EXT,
  HAI3_ACTION_UNLOAD_EXT,
} from '../../../src/mfe/constants';

describe('HAI3 constants values', () => {
  describe('schema type IDs', () => {
    it('should have correct MFE schema type IDs', () => {
      expect(HAI3_MFE_ENTRY).toBe('gts.hai3.mfes.mfe.entry.v1~');
      expect(HAI3_MFE_ENTRY_MF).toBe('gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~');
      expect(HAI3_MF_MANIFEST).toBe('gts.hai3.mfes.mfe.mf_manifest.v1~');
    });

    it('should have correct extension schema type IDs', () => {
      expect(HAI3_EXT_DOMAIN).toBe('gts.hai3.mfes.ext.domain.v1~');
      expect(HAI3_EXT_EXTENSION).toBe('gts.hai3.mfes.ext.extension.v1~');
      expect(HAI3_EXT_ACTION).toBe('gts.hai3.mfes.comm.action.v1~');
    });

    it('should confirm schema IDs end with ~', () => {
      expect(HAI3_MFE_ENTRY.endsWith('~')).toBe(true);
      expect(HAI3_MFE_ENTRY_MF.endsWith('~')).toBe(true);
      expect(HAI3_MF_MANIFEST.endsWith('~')).toBe(true);
      expect(HAI3_EXT_DOMAIN.endsWith('~')).toBe(true);
      expect(HAI3_EXT_EXTENSION.endsWith('~')).toBe(true);
      expect(HAI3_EXT_ACTION.endsWith('~')).toBe(true);
    });
  });

  describe('action instance IDs', () => {
    it('should have correct action instance IDs', () => {
      expect(HAI3_ACTION_LOAD_EXT).toBe(
        'gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.load_ext.v1'
      );
      expect(HAI3_ACTION_UNLOAD_EXT).toBe(
        'gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.unload_ext.v1'
      );
    });

    it('should confirm action IDs do not end with ~', () => {
      expect(HAI3_ACTION_LOAD_EXT.endsWith('~')).toBe(false);
      expect(HAI3_ACTION_UNLOAD_EXT.endsWith('~')).toBe(false);
    });
  });
});
