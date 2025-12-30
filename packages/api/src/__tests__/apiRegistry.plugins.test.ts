/**
 * Task 21: Automated Integration Test - Global Plugin Registration (Namespaced API)
 * Task 22: Automated Integration Test - Plugin Positioning by Class (Namespaced API)
 *
 * Tests for global plugin registration, FIFO ordering, and positioning methods.
 * Validates AC2 and AC3 from the OpenSpec.
 */

import { ApiPlugin } from '../types';
import type { ApiRequestContext } from '../types';
import { apiRegistry } from '../apiRegistry';

describe('apiRegistry.plugins', () => {
  let executionOrder: string[];

  class LoggingPlugin extends ApiPlugin<void> {
    constructor() {
      super(void 0);
    }
    onRequest(ctx: ApiRequestContext) {
      executionOrder.push('logging');
      return ctx;
    }
  }

  class AuthPlugin extends ApiPlugin<{ getToken: () => string }> {
    onRequest(ctx: ApiRequestContext) {
      executionOrder.push('auth');
      return ctx;
    }
  }

  class MetricsPlugin extends ApiPlugin<void> {
    constructor() {
      super(void 0);
    }
    onRequest(ctx: ApiRequestContext) {
      executionOrder.push('metrics');
      return ctx;
    }
  }

  beforeEach(() => {
    executionOrder = [];
    apiRegistry.reset();
  });

  // Task 21 Tests
  it('should execute plugins in FIFO order', () => {
    apiRegistry.plugins.add(
      new LoggingPlugin(),
      new AuthPlugin({ getToken: () => 'token' })
    );

    const plugins = apiRegistry.plugins.getAll();
    expect(plugins[0]).toBeInstanceOf(LoggingPlugin);
    expect(plugins[1]).toBeInstanceOf(AuthPlugin);
  });

  it('should throw on duplicate plugin class', () => {
    apiRegistry.plugins.add(new LoggingPlugin());
    expect(() => apiRegistry.plugins.add(new LoggingPlugin())).toThrow();
  });

  it('should correctly report has() for registered plugin', () => {
    apiRegistry.plugins.add(new LoggingPlugin());
    expect(apiRegistry.plugins.has(LoggingPlugin)).toBe(true);
    expect(apiRegistry.plugins.has(AuthPlugin)).toBe(false);
  });

  it('should return plugin instance via getPlugin()', () => {
    const logging = new LoggingPlugin();
    apiRegistry.plugins.add(logging);

    expect(apiRegistry.plugins.getPlugin(LoggingPlugin)).toBe(logging);
  });

  it('should return undefined for unregistered plugin', () => {
    expect(apiRegistry.plugins.getPlugin(LoggingPlugin)).toBeUndefined();
  });

  // Task 22 Tests - Plugin Positioning
  describe('plugin positioning', () => {
    it('should insert plugin after target via addAfter', () => {
      apiRegistry.plugins.add(new LoggingPlugin(), new AuthPlugin({ getToken: () => 'token' }));
      apiRegistry.plugins.addAfter(new MetricsPlugin(), LoggingPlugin);

      const plugins = apiRegistry.plugins.getAll();
      expect(plugins[0]).toBeInstanceOf(LoggingPlugin);
      expect(plugins[1]).toBeInstanceOf(MetricsPlugin);
      expect(plugins[2]).toBeInstanceOf(AuthPlugin);
    });

    it('should insert plugin before target via addBefore', () => {
      apiRegistry.plugins.add(new LoggingPlugin(), new AuthPlugin({ getToken: () => 'token' }));
      apiRegistry.plugins.addBefore(new MetricsPlugin(), AuthPlugin);

      const plugins = apiRegistry.plugins.getAll();
      expect(plugins[0]).toBeInstanceOf(LoggingPlugin);
      expect(plugins[1]).toBeInstanceOf(MetricsPlugin);
      expect(plugins[2]).toBeInstanceOf(AuthPlugin);
    });

    it('should throw when target class not registered', () => {
      apiRegistry.plugins.add(new LoggingPlugin());
      expect(() => apiRegistry.plugins.addAfter(new MetricsPlugin(), AuthPlugin)).toThrow();
    });

    it('should throw on duplicate class with positioning', () => {
      apiRegistry.plugins.add(new LoggingPlugin(), new AuthPlugin({ getToken: () => 'token' }));
      expect(() => apiRegistry.plugins.addAfter(new LoggingPlugin(), AuthPlugin)).toThrow();
    });
  });
});
