/**
 * HAI3 Application Component (without UIKit or Studio)
 *
 * Renders placeholder content.
 * Create MFE packages with `hai3 add-mfe` to add screens.
 */

function App() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Welcome to HAI3</h1>
        <p style={{ marginTop: '8px', color: '#6b7280' }}>
          Your project is ready. Use <code>hai3 add-mfe</code> to add your first MFE package.
        </p>
      </div>
    </div>
  );
}

export default App;
