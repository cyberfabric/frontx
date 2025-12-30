/**
 * Backward Compatibility Exports
 *
 * These exports provide backward compatibility with @hai3/uicore API.
 * They are singletons that mirror the old API.
 *
 * NOTE: These are exported for migration convenience but may be deprecated
 * in future major versions. Prefer using the plugin architecture.
 */

// ACCOUNTS_DOMAIN constant for backward compatibility
// NOTE: AccountsApiService has been moved to CLI templates
// This constant is kept for legacy code that references it
export const ACCOUNTS_DOMAIN = 'accounts' as const;

// ============================================================================
// Singleton Registries (backward compatibility)
// ============================================================================

// screensetRegistry is re-exported from @hai3/screensets directly
// No need for type assertion - SDK type is canonical
export { screensetRegistry } from '@hai3/screensets';
