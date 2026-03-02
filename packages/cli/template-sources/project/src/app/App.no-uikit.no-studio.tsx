/**
 * HAI3 Application Component (without UIKit or Studio)
 *
 * Renders placeholder content.
 * Create screensets with `hai3 screenset create` to add screens.
 */

function App() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Welcome to HAI3</h1>
        <p style={{ marginTop: '8px', color: '#6b7280' }}>
          Your project is ready. Create a screenset with <code>hai3 screenset create</code> to get started.
        </p>
      </div>
    </div>
  );
}

export default App;
