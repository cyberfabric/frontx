/**
 * MFE Bootstrap — executed once when any entry first loads.
 * Creates the minimal FrontX app, registers slices, effects, and API services.
 * Cache/runtime note:
 * - The host app owns server-state via createHAI3App().
 * - Mounted MFEs receive that host-owned runtime through ThemeAwareReactLifecycle.
 * - Do not add queryCache(), createHAI3App(), or QueryClientProvider here.
 */
// @cpt-dod:cpt-frontx-dod-mfe-isolation-internal-dataflow:p1
// @cpt-flow:cpt-frontx-flow-mfe-isolation-mfe-bootstrap:p1

import { createHAI3, registerSlice, apiRegistry, effects, mock } from '@cyberfabric/react';
import { homeSlice } from './slices/homeSlice';
import { initHomeEffects } from './effects/homeEffects';
import { _BlankApiService } from './api/_BlankApiService';

// Register API services BEFORE build — mock plugin syncs during build(),
// so services must already be present for mock activation to find them
apiRegistry.register(_BlankApiService);
apiRegistry.initialize();

// Create only the local MFE app shell.
// The shared server-state runtime is injected by the host during mount.
const mfeApp = createHAI3().use(effects()).use(mock()).build();

// Register slices with effects (needs store from build())
registerSlice(homeSlice, initHomeEffects);

export { mfeApp };
