/**
 * HAI3 Application Component (--uikit none, --no-studio variant)
 *
 * Minimal shell that renders the AppRouter for screen navigation.
 * No Layout wrapper is included when using --uikit none.
 * No StudioOverlay when --studio is false.
 *
 * HAI3Provider (in main.tsx) handles:
 * - Redux Provider setup
 * - HAI3 context (app instance)
 *
 * AppRouter handles:
 * - Screen lazy loading
 * - Navigation state
 *
 * Note: This template is for projects created with --uikit none.
 * User provides their own Layout components, UI kit, and theme system.
 */

import { AppRouter } from '@hai3/react';

function App() {
  return <AppRouter />;
}

export default App;
