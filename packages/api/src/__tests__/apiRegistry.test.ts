import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseApiService } from '../BaseApiService';
import { apiRegistry } from '../apiRegistry';
import { RestProtocol } from '../protocols/RestProtocol';
import { SseProtocol } from '../protocols/SseProtocol';
import { RestPlugin, SsePlugin } from '../types';

class RegistryTestService extends BaseApiService {
  static constructions = 0;

  cleanupCalls = 0;

  constructor() {
    super({ baseURL: '/registry/test' }, new RestProtocol());
    RegistryTestService.constructions += 1;
  }

  override cleanup(): void {
    this.cleanupCalls += 1;
    super.cleanup();
  }
}

class SecondaryRegistryTestService extends BaseApiService {
  static constructions = 0;

  constructor() {
    super({ baseURL: '/registry/secondary' }, new RestProtocol());
    SecondaryRegistryTestService.constructions += 1;
  }
}

class DestroyableRestPlugin extends RestPlugin {
  constructor(private readonly onDestroy: () => void) {
    super();
  }

  override destroy(): void {
    this.onDestroy();
  }
}

class AlternateRestPlugin extends RestPlugin {
  constructor(private readonly onDestroy: () => void) {
    super();
  }

  override destroy(): void {
    this.onDestroy();
  }
}

class DestroyableSsePlugin extends SsePlugin {
  constructor(private readonly onDestroy: () => void) {
    super();
  }

  override destroy(): void {
    this.onDestroy();
  }
}

describe('apiRegistry', () => {
  beforeEach(() => {
    RegistryTestService.constructions = 0;
    SecondaryRegistryTestService.constructions = 0;
    apiRegistry.reset();
  });

  afterEach(() => {
    apiRegistry.reset();
  });

  it('instantiates services on registration and exposes them through the typed accessors', () => {
    apiRegistry.register(RegistryTestService);
    apiRegistry.register(SecondaryRegistryTestService);

    const primary = apiRegistry.getService(RegistryTestService);
    const secondary = apiRegistry.getService(SecondaryRegistryTestService);

    expect(RegistryTestService.constructions).toBe(1);
    expect(SecondaryRegistryTestService.constructions).toBe(1);
    expect(apiRegistry.has(RegistryTestService)).toBe(true);
    expect(apiRegistry.has(SecondaryRegistryTestService)).toBe(true);
    expect(apiRegistry.getAll()).toEqual([primary, secondary]);
  });

  it('throws a helpful error when a service was not registered', () => {
    expect(() => apiRegistry.getService(RegistryTestService)).toThrow(
      'Service not found. Did you forget to call apiRegistry.register(RegistryTestService)?'
    );
  });

  it('keeps the default config when initialized without overrides and returns defensive copies', () => {
    apiRegistry.initialize();

    const config = apiRegistry.getConfig() as Record<string, unknown>;
    config.injected = 'local mutation only';

    expect(apiRegistry.getConfig()).toEqual({});
  });

  it('resets registered services, global plugins, and configuration together', () => {
    apiRegistry.register(RegistryTestService);
    const registeredService = apiRegistry.getService(RegistryTestService);

    const onRestDestroy = vi.fn();
    const onSseDestroy = vi.fn();
    apiRegistry.plugins.add(RestProtocol, new DestroyableRestPlugin(onRestDestroy));
    apiRegistry.plugins.add(SseProtocol, new DestroyableSsePlugin(onSseDestroy));
    apiRegistry.initialize({});

    apiRegistry.reset();

    expect(registeredService.cleanupCalls).toBe(1);
    expect(apiRegistry.getAll()).toEqual([]);
    expect(apiRegistry.getConfig()).toEqual({});
    expect(apiRegistry.plugins.getAll(RestProtocol)).toEqual([]);
    expect(apiRegistry.plugins.getAll(SseProtocol)).toEqual([]);
    expect(onRestDestroy).toHaveBeenCalledTimes(1);
    expect(onSseDestroy).toHaveBeenCalledTimes(1);
  });
});

describe('apiRegistry.plugins', () => {
  beforeEach(() => {
    apiRegistry.reset();
  });

  afterEach(() => {
    apiRegistry.reset();
  });

  it('reports empty state for protocols with no registered plugins', () => {
    const destroySpy = vi.fn();

    expect(apiRegistry.plugins.has(RestProtocol, DestroyableRestPlugin)).toBe(false);
    expect(apiRegistry.plugins.getAll(RestProtocol)).toEqual([]);

    apiRegistry.plugins.remove(RestProtocol, DestroyableRestPlugin);
    apiRegistry.plugins.clear(RestProtocol);

    expect(destroySpy).not.toHaveBeenCalled();
  });

  it('adds, removes, and clears plugins per protocol while calling destroy hooks', () => {
    const restOneDestroy = vi.fn();
    const restTwoDestroy = vi.fn();
    const sseDestroy = vi.fn();

    const restOne = new DestroyableRestPlugin(restOneDestroy);
    const restTwo = new AlternateRestPlugin(restTwoDestroy);
    const ssePlugin = new DestroyableSsePlugin(sseDestroy);

    apiRegistry.plugins.add(RestProtocol, restOne);
    apiRegistry.plugins.add(RestProtocol, restTwo);
    apiRegistry.plugins.add(SseProtocol, ssePlugin);

    expect(apiRegistry.plugins.has(RestProtocol, DestroyableRestPlugin)).toBe(true);
    expect(apiRegistry.plugins.has(RestProtocol, AlternateRestPlugin)).toBe(true);
    expect(apiRegistry.plugins.has(SseProtocol, DestroyableSsePlugin)).toBe(true);
    expect(apiRegistry.plugins.getAll(RestProtocol)).toEqual([restOne, restTwo]);
    expect(apiRegistry.plugins.getAll(SseProtocol)).toEqual([ssePlugin]);

    apiRegistry.plugins.remove(RestProtocol, DestroyableRestPlugin);

    expect(restOneDestroy).toHaveBeenCalledTimes(1);
    expect(restTwoDestroy).not.toHaveBeenCalled();
    expect(apiRegistry.plugins.has(RestProtocol, DestroyableRestPlugin)).toBe(false);
    expect(apiRegistry.plugins.getAll(RestProtocol)).toEqual([restTwo]);
    expect(apiRegistry.plugins.getAll(SseProtocol)).toEqual([ssePlugin]);

    apiRegistry.plugins.clear(RestProtocol);
    apiRegistry.plugins.clear(SseProtocol);

    expect(restTwoDestroy).toHaveBeenCalledTimes(1);
    expect(sseDestroy).toHaveBeenCalledTimes(1);
    expect(apiRegistry.plugins.getAll(RestProtocol)).toEqual([]);
    expect(apiRegistry.plugins.getAll(SseProtocol)).toEqual([]);
  });
});
