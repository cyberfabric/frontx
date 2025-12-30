/**
 * Task 26: Automated Integration Test - Internal Global Plugins Injection
 *
 * Tests for global plugins provider injection into services.
 * Validates AC7 from the OpenSpec - verifies that services receive
 * global plugins via the provider pattern.
 */

import { BaseApiService } from '../BaseApiService';
import { RestProtocol } from '../protocols/RestProtocol';
import { ApiPlugin } from '../types';
import type { ApiRequestContext } from '../types';
import { apiRegistry } from '../apiRegistry';

describe('global plugins injection', () => {
  let pluginExecutionLog: string[];

  class LoggingPlugin extends ApiPlugin<void> {
    constructor() {
      super(void 0);
    }
    onRequest(ctx: ApiRequestContext) {
      pluginExecutionLog.push('logging');
      return ctx;
    }
  }

  class AuthPlugin extends ApiPlugin<void> {
    constructor() {
      super(void 0);
    }
    onRequest(ctx: ApiRequestContext) {
      pluginExecutionLog.push('auth');
      return ctx;
    }
  }

  class TestService extends BaseApiService {
    constructor() {
      super({ baseURL: '/api' }, new RestProtocol());
    }
  }

  class AnotherService extends BaseApiService {
    constructor() {
      super({ baseURL: '/api/another' }, new RestProtocol());
    }
  }

  beforeEach(() => {
    pluginExecutionLog = [];
    apiRegistry.reset();
  });

  it('should inject global plugins registered BEFORE service', () => {
    apiRegistry.plugins.add(new LoggingPlugin());
    apiRegistry.register(TestService);

    const service = apiRegistry.getService(TestService);

    // Global plugins should be accessible via provider
    // Service can access via plugins.getPlugin()
    const globalLogging = service.plugins.getPlugin(LoggingPlugin);
    expect(globalLogging).toBeInstanceOf(LoggingPlugin);
  });

  it('should inject global plugins registered AFTER service', () => {
    apiRegistry.register(TestService);
    apiRegistry.plugins.add(new AuthPlugin());

    const service = apiRegistry.getService(TestService);

    // Global plugins added after registration should still be accessible
    // because provider is a function called dynamically
    const globalAuth = service.plugins.getPlugin(AuthPlugin);
    expect(globalAuth).toBeInstanceOf(AuthPlugin);
  });

  it('should share same global plugins across all services', () => {
    const logging = new LoggingPlugin();
    apiRegistry.plugins.add(logging);

    apiRegistry.register(TestService);
    apiRegistry.register(AnotherService);

    const service1 = apiRegistry.getService(TestService);
    const service2 = apiRegistry.getService(AnotherService);

    // Both services should access the same global plugin instance
    expect(service1.plugins.getPlugin(LoggingPlugin)).toBe(logging);
    expect(service2.plugins.getPlugin(LoggingPlugin)).toBe(logging);
  });

  it('should update available global plugins dynamically', () => {
    apiRegistry.register(TestService);
    const service = apiRegistry.getService(TestService);

    // Initially no global plugins
    expect(service.plugins.getPlugin(LoggingPlugin)).toBeUndefined();

    // Add global plugin
    apiRegistry.plugins.add(new LoggingPlugin());

    // Now available via provider
    expect(service.plugins.getPlugin(LoggingPlugin)).toBeInstanceOf(LoggingPlugin);
  });

  it('should not affect service when global plugin is removed', () => {
    apiRegistry.plugins.add(new LoggingPlugin());
    apiRegistry.register(TestService);
    const service = apiRegistry.getService(TestService);

    // Plugin is accessible
    expect(service.plugins.getPlugin(LoggingPlugin)).toBeInstanceOf(LoggingPlugin);

    // Remove global plugin
    apiRegistry.plugins.remove(LoggingPlugin);

    // No longer accessible
    expect(service.plugins.getPlugin(LoggingPlugin)).toBeUndefined();
  });

  it('should respect exclusions when accessing global plugins', () => {
    class ServiceWithExclusion extends BaseApiService {
      constructor() {
        super({ baseURL: '/api/exclusive' }, new RestProtocol());
        this.plugins.exclude(AuthPlugin);
      }
    }

    apiRegistry.plugins.add(new LoggingPlugin(), new AuthPlugin());
    apiRegistry.register(ServiceWithExclusion);

    const service = apiRegistry.getService(ServiceWithExclusion);

    // Logging should be accessible
    expect(service.plugins.getPlugin(LoggingPlugin)).toBeInstanceOf(LoggingPlugin);

    // Auth should still be accessible via getPlugin() (exclusion only affects execution)
    // but it's in the excluded list
    expect(service.plugins.getExcluded()).toContain(AuthPlugin);
    expect(service.plugins.getPlugin(AuthPlugin)).toBeInstanceOf(AuthPlugin);
  });

  it('should maintain FIFO order in merged plugin list', () => {
    class ServiceSpecificPlugin extends ApiPlugin<void> {
      constructor() {
        super(void 0);
      }
    }

    apiRegistry.plugins.add(new LoggingPlugin(), new AuthPlugin());
    apiRegistry.register(TestService);

    const service = apiRegistry.getService(TestService);
    service.plugins.add(new ServiceSpecificPlugin());

    // Access merged plugins (protected method, testing structure)
    // Global plugins should come first, then service plugins
    type ServiceWithProtectedMethods = { getMergedPluginsInOrder: () => unknown[] };
    const mergedPlugins = (service as unknown as ServiceWithProtectedMethods).getMergedPluginsInOrder();

    expect(mergedPlugins[0]).toBeInstanceOf(LoggingPlugin);
    expect(mergedPlugins[1]).toBeInstanceOf(AuthPlugin);
    expect(mergedPlugins[2]).toBeInstanceOf(ServiceSpecificPlugin);
  });

  it('should filter excluded plugins from merged list', () => {
    class ServiceWithExclusion extends BaseApiService {
      constructor() {
        super({ baseURL: '/api/exclusive' }, new RestProtocol());
        this.plugins.exclude(AuthPlugin);
      }
    }

    apiRegistry.plugins.add(new LoggingPlugin(), new AuthPlugin());
    apiRegistry.register(ServiceWithExclusion);

    const service = apiRegistry.getService(ServiceWithExclusion);

    // Access merged plugins (protected method, testing structure)
    type ServiceWithProtectedMethods = { getMergedPluginsInOrder: () => unknown[] };
    const mergedPlugins = (service as unknown as ServiceWithProtectedMethods).getMergedPluginsInOrder();

    // AuthPlugin should be filtered out
    expect(mergedPlugins.length).toBe(1);
    expect(mergedPlugins[0]).toBeInstanceOf(LoggingPlugin);
  });
});
