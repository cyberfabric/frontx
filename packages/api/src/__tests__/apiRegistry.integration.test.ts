/**
 * Task 20: Automated Integration Test - Class-Based Service Registration
 *
 * Tests for class-based service registration with apiRegistry.
 * Validates AC1 from the OpenSpec.
 */

import { BaseApiService } from '../BaseApiService';
import { RestProtocol } from '../protocols/RestProtocol';
import { apiRegistry } from '../apiRegistry';

describe('apiRegistry class-based registration', () => {
  beforeEach(() => {
    apiRegistry.reset();
  });

  it('should register service by class constructor', () => {
    class TestService extends BaseApiService {
      constructor() {
        super({ baseURL: '/test' }, new RestProtocol());
      }
    }

    apiRegistry.register(TestService);
    expect(apiRegistry.has(TestService)).toBe(true);
  });

  it('should return correctly typed instance from getService', () => {
    class TestService extends BaseApiService {
      constructor() {
        super({ baseURL: '/test' }, new RestProtocol());
      }
    }

    apiRegistry.register(TestService);
    const service = apiRegistry.getService(TestService);
    expect(service).toBeInstanceOf(TestService);
  });

  it('should return false for unregistered service', () => {
    class UnregisteredService extends BaseApiService {
      constructor() {
        super({ baseURL: '/unregistered' }, new RestProtocol());
      }
    }

    expect(apiRegistry.has(UnregisteredService)).toBe(false);
  });

  it('should throw on getService for unregistered class', () => {
    class NotRegistered extends BaseApiService {
      constructor() {
        super({ baseURL: '/not-registered' }, new RestProtocol());
      }
    }

    expect(() => apiRegistry.getService(NotRegistered)).toThrow();
  });
});
