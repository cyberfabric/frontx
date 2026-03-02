/**
 * HAI3 Application Component
 *
 * Renders the Layout shell with placeholder content.
 * Create screensets with `hai3 screenset create` to add screens.
 */

import { Layout } from '@/app/layout';

function App() {
  return (
    <Layout>
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to HAI3</h1>
          <p className="mt-2 text-muted-foreground">
            Your project is ready. Create a screenset with <code className="text-sm bg-muted px-1.5 py-0.5 rounded">hai3 screenset create</code> to get started.
          </p>
        </div>
      </div>
    </Layout>
  );
}

export default App;
