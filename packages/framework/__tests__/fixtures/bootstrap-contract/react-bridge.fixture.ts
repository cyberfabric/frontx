type TestScreensetsRegistry = {
  typeSystem: {
    register: (entry: Record<string, unknown>) => void;
    registerSchema: (schema: Record<string, unknown>) => void;
  };
  registerExtension: (extension: Record<string, unknown>) => Promise<void>;
};

export async function bootstrapMfeDomains(
  _app: unknown,
  _screenContainerRef: { current: HTMLDivElement | null },
): Promise<TestScreensetsRegistry> {
  throw new Error('react-bridge.fixture.ts should be mocked by describeBootstrapMfeContract tests');
}
