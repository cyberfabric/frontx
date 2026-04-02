import { describe, expect, it, vi } from 'vitest';
import {
  registerSharedDescriptorTeardown,
  runSharedTestCleanup,
} from '../vitest.setup';

describe('runSharedTestCleanup', () => {
  it('restores globals stubbed via vi.stubGlobal', () => {
    const globalKey = '__shared_setup_stubbed_global__';

    vi.stubGlobal(globalKey, { observe: vi.fn() });
    expect(Reflect.get(globalThis, globalKey)).toBeTruthy();

    runSharedTestCleanup();

    expect(Reflect.has(globalThis, globalKey)).toBe(false);
  });

  it('restores descriptor-based globals registered on first use', () => {
    const target = {};

    registerSharedDescriptorTeardown(target, 'clipboard', 'test-clipboard');
    Object.defineProperty(target, 'clipboard', {
      value: { writeText: vi.fn() },
      configurable: true,
    });
    expect(Reflect.has(target, 'clipboard')).toBe(true);

    runSharedTestCleanup();

    expect(Reflect.has(target, 'clipboard')).toBe(false);
  });
});
