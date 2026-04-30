/**
 * Typed {@link MfeHandler} test double for registry tests — avoids `as unknown as` casts.
 */

import { vi, type Mock } from 'vitest';
import { MfeBridgeFactory, MfeHandler } from '../src/mfe/handler/types';
import type { ChildMfeBridge, MfeEntryLifecycle } from '../src/mfe/handler/types';
import type { MfeEntry } from '../src/mfe/types';

// @cpt-dod:cpt-frontx-dod-mfe-registry-handler-injection:p1

// @cpt-begin:cpt-frontx-dod-mfe-registry-handler-injection:p1:inst-mfe-handler-test-double
class TestNoopBridgeFactory extends MfeBridgeFactory<ChildMfeBridge> {
  create(): ChildMfeBridge {
    throw new Error('Test double: bridge factory should not be used in this suite');
  }

  dispose(_bridge: ChildMfeBridge): void {
    // Test double does not allocate bridge resources.
  }
}

/**
 * Concrete handler with a {@link vi.fn} `load` for assertions.
 */
export class TestDoubleMfeHandler extends MfeHandler {
  readonly bridgeFactory = new TestNoopBridgeFactory();

  override load: Mock<(entry: MfeEntry) => Promise<MfeEntryLifecycle<ChildMfeBridge>>>;

  constructor(
    handledBaseTypeId: string,
    priority: number,
    load?: Mock<(entry: MfeEntry) => Promise<MfeEntryLifecycle<ChildMfeBridge>>>
  ) {
    super(handledBaseTypeId, priority);
    this.load =
      load ??
      vi
        .fn<(entry: MfeEntry) => Promise<MfeEntryLifecycle<ChildMfeBridge>>>()
        .mockResolvedValue({
          mount: vi.fn().mockResolvedValue(undefined),
          unmount: vi.fn().mockResolvedValue(undefined),
        });
  }
}

export function makeMfeHandlerDouble(options: {
  handledBaseTypeId: string;
  priority?: number;
  load?: Mock<(entry: MfeEntry) => Promise<MfeEntryLifecycle<ChildMfeBridge>>>;
}): TestDoubleMfeHandler {
  return new TestDoubleMfeHandler(
    options.handledBaseTypeId,
    options.priority ?? 0,
    options.load
  );
}
// @cpt-end:cpt-frontx-dod-mfe-registry-handler-injection:p1:inst-mfe-handler-test-double
