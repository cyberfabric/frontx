/**
 * Shared MfeEntryMF stubs for handler tests (load path ignores contract fields).
 */

import type { MfeEntryMF } from '../../../src/mfe/types';

export const TEST_MF_ENTRY_BASE: Pick<MfeEntryMF, 'requiredProperties' | 'actions' | 'domainActions'> = {
  requiredProperties: [],
  actions: [],
  domainActions: [],
};
