/**
 * HAI3 Application Component (--uikit none variant)
 *
 * Minimal shell that renders the AppRouter for screen navigation.
 * No Layout wrapper is included when using --uikit none.
 *
 * HAI3Provider (in main.tsx) handles:
 * - Redux Provider setup
 * - HAI3 context (app instance)
 *
 * AppRouter handles:
 * - Screen lazy loading
 * - Navigation state
 *
 * StudioOverlay (dev mode only):
 * - Development tools for screenset switching
 * - Language selection
 * - API mode toggle (services register their own mocks)
 *
 * Note: This template is for projects created with --uikit none.
 * User provides their own Layout components, UI kit, and theme system.
 */

import { AppRouter } from '@hai3/react';
import { StudioOverlay } from '@hai3/studio';

function App() {
  return (
    <>
      <AppRouter />
      <StudioOverlay />
    </>
  );
}

export default App;
