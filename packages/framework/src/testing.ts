/**
 * Test-only entry for @cyberfabric/framework.
 *
 * Utilities here are intended for Vitest (or similar) teardown between cases.
 * They are not re-exported from the main package; import from `@cyberfabric/framework/testing`.
 */

export { resetSharedQueryClient } from './plugins/queryCache';
