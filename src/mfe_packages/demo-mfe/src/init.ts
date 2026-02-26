/**
 * MFE Bootstrap
 *
 * Creates the MFE-local HAI3 app instance, registers slices with effects,
 * and registers API services. This module is imported once (as a side effect)
 * by ThemeAwareReactLifecycle, which provides the HAI3Provider to all screens.
 *
 * The MFE bundles its own copy of @hai3/react, giving it isolated singletons:
 * - eventBus (no cross-MFE event leakage)
 * - apiRegistry (isolated service instances)
 * - storeInstance (isolated Redux store)
 */

import { createHAI3, registerSlice, apiRegistry, effects, mock } from '@hai3/react';
import { profileSlice } from './slices/profileSlice';
import { initProfileEffects } from './effects/profileEffects';
import { AccountsApiService } from './api/AccountsApiService';

// Register API services BEFORE build — mock plugin syncs during build(),
// so services must already be present for mock activation to find them
apiRegistry.register(AccountsApiService);
apiRegistry.initialize();

// Create HAI3 app with effects + mock plugins (mock auto-enables on localhost)
const mfeApp = createHAI3().use(effects()).use(mock()).build();

// Register slices with effects (needs store from build())
registerSlice(profileSlice, initProfileEffects);

export { mfeApp };
