/**
 * Mount Context Lifecycle Tests
 *
 * Verifies:
 * - setMountContext stores context for an extension
 * - getMountContext retrieves stored context
 * - clearMountContext removes stored context
 * - Context is frozen (immutable) once set
 * - setMountContext throws for unregistered extensions
 * - clearMountContext is safe for unregistered extensions
 * - MountManager passes mountContext to lifecycle.mount()
 *
 * @cpt-FEATURE:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefaultMountManager } from '../../../src/mfe/runtime/default-mount-manager';
import { DefaultExtensionManager } from '../../../src/mfe/runtime/default-extension-manager';
import { DefaultRuntimeBridgeFactory } from '../../../src/mfe/runtime/default-runtime-bridge-factory';
import { gtsPlugin } from '../../../src/mfe/plugins/gts';
import type { ExtensionDomain, Extension, MfeEntry } from '../../../src/mfe/types';
import type { MfeEntryLifecycle, MfeMountContext } from '../../../src/mfe/handler/types';
import type { RuntimeCoordinator } from '../../../src/mfe/coordination/types';
import type { ScreensetsRegistry } from '../../../src/mfe/runtime/ScreensetsRegistry';
import { MockContainerProvider } from '../test-utils';
import {
  HAI3_ACTION_LOAD_EXT,
  HAI3_ACTION_MOUNT_EXT,
  HAI3_ACTION_UNMOUNT_EXT,
} from '../../../src/mfe/constants';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const DOMAIN_ID = 'gts.hai3.mfes.ext.domain.v1~hai3.test.mount_context.domain.v1';
const ENTRY_ID = 'gts.hai3.mfes.mfe.entry.v1~hai3.test.mount_context.entry.v1';
const EXT_ID = 'gts.hai3.mfes.ext.extension.v1~hai3.test.mount_context.ext.v1';

const testDomain: ExtensionDomain = {
  id: DOMAIN_ID,
  sharedProperties: [],
  actions: [HAI3_ACTION_LOAD_EXT, HAI3_ACTION_MOUNT_EXT, HAI3_ACTION_UNMOUNT_EXT],
  extensionsActions: [],
  defaultActionTimeout: 5000,
  lifecycleStages: [
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
  ],
  extensionsLifecycleStages: [
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.activated.v1',
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.deactivated.v1',
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
  ],
};

const testEntry: MfeEntry = {
  id: ENTRY_ID,
  requiredProperties: [],
  optionalProperties: [],
  actions: [],
  domainActions: [HAI3_ACTION_LOAD_EXT, HAI3_ACTION_MOUNT_EXT, HAI3_ACTION_UNMOUNT_EXT],
};

const testExtension: Extension = {
  id: EXT_ID,
  domain: DOMAIN_ID,
  entry: ENTRY_ID,
};

// ---------------------------------------------------------------------------
// ExtensionManager mount context
// ---------------------------------------------------------------------------

// @cpt-begin:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-test-mount-context-lifecycle
describe('DefaultExtensionManager — mount context', () => {
  let extensionManager: DefaultExtensionManager;
  let mockContainerProvider: MockContainerProvider;

  beforeEach(() => {
    gtsPlugin.register(testEntry);

    extensionManager = new DefaultExtensionManager({
      typeSystem: gtsPlugin,
      triggerLifecycle: vi.fn().mockResolvedValue(undefined),
      triggerDomainOwnLifecycle: vi.fn().mockResolvedValue(undefined),
      unmountExtension: vi.fn().mockResolvedValue(undefined),
      validateEntryType: vi.fn(),
    });

    mockContainerProvider = new MockContainerProvider();
    extensionManager.registerDomain(testDomain, mockContainerProvider);
  });

  it('stores and retrieves mount context for a registered extension', async () => {
    await extensionManager.registerExtension(testExtension);

    const ctx: MfeMountContext = { extensionId: EXT_ID, domainId: DOMAIN_ID };
    extensionManager.setMountContext(EXT_ID, ctx);

    const retrieved = extensionManager.getMountContext(EXT_ID);
    expect(retrieved).toEqual(ctx);
  });

  it('returns undefined when no mount context is set', async () => {
    await extensionManager.registerExtension(testExtension);
    expect(extensionManager.getMountContext(EXT_ID)).toBeUndefined();
  });

  it('clears mount context', async () => {
    await extensionManager.registerExtension(testExtension);

    extensionManager.setMountContext(EXT_ID, { extensionId: EXT_ID });
    extensionManager.clearMountContext(EXT_ID);

    expect(extensionManager.getMountContext(EXT_ID)).toBeUndefined();
  });

  it('freezes the stored context to prevent mutation', async () => {
    await extensionManager.registerExtension(testExtension);

    const ctx: MfeMountContext = { extensionId: EXT_ID, domainId: DOMAIN_ID };
    extensionManager.setMountContext(EXT_ID, ctx);

    const retrieved = extensionManager.getMountContext(EXT_ID);
    expect(Object.isFrozen(retrieved)).toBe(true);
  });

  it('throws when setting context for an unregistered extension', () => {
    expect(() =>
      extensionManager.setMountContext('nonexistent', { extensionId: 'x' })
    ).toThrow("Extension 'nonexistent' not registered");
  });

  it('does not throw when clearing context for an unregistered extension', () => {
    expect(() => extensionManager.clearMountContext('nonexistent')).not.toThrow();
  });

  it('replaces existing mount context when set again', async () => {
    await extensionManager.registerExtension(testExtension);

    extensionManager.setMountContext(EXT_ID, { extensionId: 'first' });
    extensionManager.setMountContext(EXT_ID, { extensionId: 'second' });

    expect(extensionManager.getMountContext(EXT_ID)?.extensionId).toBe('second');
  });
});
// @cpt-end:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-test-mount-context-lifecycle

// ---------------------------------------------------------------------------
// MountManager passes mountContext to lifecycle.mount()
// ---------------------------------------------------------------------------

// @cpt-begin:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-test-mount-manager-context
describe('DefaultMountManager — mount context forwarding', () => {
  let mountManager: DefaultMountManager;
  let extensionManager: DefaultExtensionManager;
  let mockContainerProvider: MockContainerProvider;
  let mockLifecycle: MfeEntryLifecycle;

  beforeEach(() => {
    gtsPlugin.register(testEntry);

    extensionManager = new DefaultExtensionManager({
      typeSystem: gtsPlugin,
      triggerLifecycle: vi.fn().mockResolvedValue(undefined),
      triggerDomainOwnLifecycle: vi.fn().mockResolvedValue(undefined),
      unmountExtension: vi.fn().mockResolvedValue(undefined),
      validateEntryType: vi.fn(),
    });

    mockContainerProvider = new MockContainerProvider();
    mockLifecycle = {
      mount: vi.fn().mockResolvedValue(undefined),
      unmount: vi.fn().mockResolvedValue(undefined),
    };

    const coordinator: RuntimeCoordinator = {
      register: vi.fn(),
      unregister: vi.fn(),
      get: vi.fn(),
    };

    const bridgeFactory = new DefaultRuntimeBridgeFactory();

    mountManager = new DefaultMountManager({
      extensionManager,
      resolveHandler: (_entryTypeId: string) => ({
        handledBaseTypeId: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~',
        priority: 0,
        load: vi.fn().mockResolvedValue(mockLifecycle),
        bridgeFactory: undefined,
      }),
      coordinator,
      triggerLifecycle: vi.fn().mockResolvedValue(undefined),
      executeActionsChain: vi.fn().mockResolvedValue(undefined),
      hostRuntime: {} as ScreensetsRegistry,
      registerDomainActionHandler: vi.fn(),
      unregisterDomainActionHandler: vi.fn(),
      bridgeFactory,
      resolveMountContext: (extId) => extensionManager.getMountContext(extId),
    });

    extensionManager.registerDomain(testDomain, mockContainerProvider);
  });

  it('passes mountContext as the third argument to lifecycle.mount()', async () => {
    await extensionManager.registerExtension(testExtension);

    const fakeQueryClient = {
      getQueryCache: () => ({}),
      getMutationCache: () => ({}),
      defaultQueryOptions: () => ({}),
    };

    const ctx: MfeMountContext = {
      queryClient: fakeQueryClient,
      extensionId: EXT_ID,
      domainId: DOMAIN_ID,
    };

    extensionManager.setMountContext(EXT_ID, ctx);

    const container = mockContainerProvider.mockContainer as HTMLElement;
    await mountManager.mountExtension(EXT_ID, container);

    expect(mockLifecycle.mount).toHaveBeenCalledOnce();
    const callArgs = (mockLifecycle.mount as ReturnType<typeof vi.fn>).mock.calls[0];
    // Third argument should be the mount context
    expect(callArgs[2]).toBeDefined();
    expect(callArgs[2].extensionId).toBe(EXT_ID);
    expect(callArgs[2].queryClient).toBeDefined();
  });

  it('passes undefined mountContext when none is set', async () => {
    await extensionManager.registerExtension(testExtension);

    const container = mockContainerProvider.mockContainer as HTMLElement;
    await mountManager.mountExtension(EXT_ID, container);

    expect(mockLifecycle.mount).toHaveBeenCalledOnce();
    const callArgs = (mockLifecycle.mount as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[2]).toBeUndefined();
  });
});
// @cpt-end:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-test-mount-manager-context
