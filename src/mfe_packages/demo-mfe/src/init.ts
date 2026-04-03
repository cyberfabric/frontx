/**
 * MFE Bootstrap
 *
 * Creates the MFE-local FrontX app instance, registers slices with effects,
 * and registers API services. This module is imported once (as a side effect)
 * by ThemeAwareReactLifecycle, which provides the FrontXProvider to all screens.
 *
 * The MFE bundles its own copy of @cyberfabric/react, giving it isolated singletons:
 * - eventBus (no cross-MFE event leakage)
 * - apiRegistry (isolated service instances)
 * - storeInstance (isolated Redux store)
 */
// @cpt-dod:cpt-frontx-dod-mfe-isolation-internal-dataflow:p1
// @cpt-flow:cpt-frontx-flow-mfe-isolation-mfe-bootstrap:p1

import { createHAI3, apiRegistry, effects, mock } from '@cyberfabric/react';
import { AccountsApiService } from './api/AccountsApiService';

// Register API services BEFORE build — mock plugin syncs during build(),
// so services must already be present for mock activation to find them
apiRegistry.register(AccountsApiService);
apiRegistry.initialize();

// Create FrontX app with effects + mock plugins (mock auto-enables on localhost)
const mfeApp = createHAI3().use(effects()).use(mock()).build();

export { mfeApp };
