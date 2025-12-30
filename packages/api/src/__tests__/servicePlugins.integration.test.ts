/**
 * Task 24: Automated Integration Test - Service Exclusion by Class
 * Task 25: Automated Integration Test - getPlugin() Method
 *
 * Tests for service-level plugin exclusion and getPlugin() functionality.
 * Validates AC5 and AC6 from the OpenSpec.
 */

import { BaseApiService } from '../BaseApiService';
import { RestProtocol } from '../protocols/RestProtocol';
import { ApiPlugin } from '../types';
import type { ApiRequestContext } from '../types';
import { apiRegistry } from '../apiRegistry';

describe('service plugin exclusion', () => {
  let _authPluginExecuted: boolean;

  class AuthPlugin extends ApiPlugin<void> {
    constructor() {
      super(void 0);
    }
    onRequest(ctx: ApiRequestContext) {
      _authPluginExecuted = true;
      return ctx;
    }
  }

  class RegularService extends BaseApiService {
    constructor() {
      super({ baseURL: '/api/regular' }, new RestProtocol());
    }
  }

  class HealthService extends BaseApiService {
    constructor() {
      super({ baseURL: '/api/health' }, new RestProtocol());
      this.plugins.exclude(AuthPlugin);
    }
  }

  beforeEach(() => {
    _authPluginExecuted = false;
    apiRegistry.reset();
    apiRegistry.plugins.add(new AuthPlugin());
  });

  it('should exclude global plugin from service with exclusion', () => {
    apiRegistry.register(HealthService);
    const health = apiRegistry.getService(HealthService);

    expect(health.plugins.getExcluded()).toContain(AuthPlugin);
  });

  it('should include excluded plugin class in getExcluded()', () => {
    apiRegistry.register(HealthService);
    const health = apiRegistry.getService(HealthService);

    const excluded = health.plugins.getExcluded();
    expect(excluded.length).toBe(1);
    expect(excluded[0]).toBe(AuthPlugin);
  });

  it('should not exclude global plugin from service without exclusion', () => {
    apiRegistry.register(RegularService);
    const regular = apiRegistry.getService(RegularService);

    expect(regular.plugins.getExcluded()).not.toContain(AuthPlugin);
    expect(regular.plugins.getExcluded().length).toBe(0);
  });

  it('should return service-specific plugins via plugins.getAll()', () => {
    class ServiceSpecificPlugin extends ApiPlugin<void> {
      constructor() {
        super(void 0);
      }
    }

    apiRegistry.register(RegularService);
    const service = apiRegistry.getService(RegularService);
    const servicePlugin = new ServiceSpecificPlugin();
    service.plugins.add(servicePlugin);

    const allPlugins = service.plugins.getAll();
    expect(allPlugins.length).toBe(1);
    expect(allPlugins[0]).toBe(servicePlugin);
  });
});

describe('getPlugin() method', () => {
  class LoggingPlugin extends ApiPlugin<void> {
    constructor() {
      super(void 0);
    }
  }

  class AuthPlugin extends ApiPlugin<void> {
    constructor() {
      super(void 0);
    }
  }

  class RateLimitPlugin extends ApiPlugin<{ limit: number }> {}

  class TestService extends BaseApiService {
    constructor() {
      super({ baseURL: '/api' }, new RestProtocol());
    }
  }

  beforeEach(() => {
    apiRegistry.reset();
  });

  // Task 25 Tests
  it('should return plugin instance from registry', () => {
    const logging = new LoggingPlugin();
    apiRegistry.plugins.add(logging);

    expect(apiRegistry.plugins.getPlugin(LoggingPlugin)).toBe(logging);
  });

  it('should return undefined for unregistered plugin at registry level', () => {
    expect(apiRegistry.plugins.getPlugin(LoggingPlugin)).toBeUndefined();
  });

  it('should search service plugins first at service level', () => {
    const serviceRateLimit = new RateLimitPlugin({ limit: 100 });
    apiRegistry.register(TestService);
    const service = apiRegistry.getService(TestService);
    service.plugins.add(serviceRateLimit);

    expect(service.plugins.getPlugin(RateLimitPlugin)).toBe(serviceRateLimit);
  });

  it('should fall back to global plugins at service level', () => {
    const globalAuth = new AuthPlugin();
    apiRegistry.plugins.add(globalAuth);
    apiRegistry.register(TestService);
    const service = apiRegistry.getService(TestService);

    expect(service.plugins.getPlugin(AuthPlugin)).toBe(globalAuth);
  });

  it('should return undefined when plugin not found in service or global', () => {
    apiRegistry.register(TestService);
    const service = apiRegistry.getService(TestService);

    expect(service.plugins.getPlugin(LoggingPlugin)).toBeUndefined();
  });

  it('should prioritize service plugin over global plugin', () => {
    const globalRateLimit = new RateLimitPlugin({ limit: 50 });
    const serviceRateLimit = new RateLimitPlugin({ limit: 100 });

    apiRegistry.plugins.add(globalRateLimit);
    apiRegistry.register(TestService);
    const service = apiRegistry.getService(TestService);
    service.plugins.add(serviceRateLimit);

    // Service plugin should be found first
    expect(service.plugins.getPlugin(RateLimitPlugin)).toBe(serviceRateLimit);
  });
});
