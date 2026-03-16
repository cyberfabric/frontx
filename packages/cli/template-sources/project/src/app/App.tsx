/**
 * HAI3 Application Component
 *
 * Renders the Layout shell with placeholder content.
 * Create MFE packages with `hai3 add-mfe` to add screens.
 *
 * HAI3Provider (in main.tsx) handles:
 * - Redux Provider setup
 * - HAI3 context (app instance)
 *
 * Layout handles:
 * - Header, Menu, Footer, Sidebar rendering
 * - Theme-aware styling via hooks
 *
 * StudioOverlay (dev mode only):
 * - Development tools for theme/screenset switching
 * - Language selection
 * - API mode toggle
 */

import { Layout } from '@/app/layout';
import { StudioOverlay } from '@hai3/studio';

function App() {
  return (
    <>
      <Layout>
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Welcome to HAI3</h1>
            <p className="mt-2 text-muted-foreground">
              Your project is ready. Use <code className="text-sm bg-muted px-1.5 py-0.5 rounded">hai3 add-mfe</code> to add your first MFE package.
            </p>
          </div>
        </div>
      </Layout>
      <StudioOverlay />
    </>
  );
}

export default App;
