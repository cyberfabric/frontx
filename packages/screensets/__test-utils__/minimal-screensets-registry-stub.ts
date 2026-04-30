import { vi } from 'vitest';
import { MfeRegistry } from '../src/mfe/runtime/MfeRegistry';
import type {
  Extension,
  ExtensionDomain,
  ActionsChain,
} from '../src/mfe/types';
import type { ParentMfeBridge } from '../src/mfe/handler/types';
import type { ContainerProvider } from '../src/mfe/runtime/container-provider';
import type { RegisterDomainOptions } from '../src/mfe/runtime/MfeRegistry';
import { createMockTypeSystemPlugin } from './mock-type-system-plugin';

// @cpt-dod:cpt-frontx-dod-mfe-registry-handler-injection:p1

/**
 * Placeholder registry reference for mount-manager tests that only thread the
 * object into a mock runtime coordinator.
 */
// @cpt-begin:cpt-frontx-dod-mfe-registry-handler-injection:p1:inst-minimal-registry-stub
export function createMinimalMfeRegistryStub(): MfeRegistry {
  return new MinimalMfeRegistryStub();
}

class MinimalMfeRegistryStub extends MfeRegistry {
  readonly typeSystem = createMockTypeSystemPlugin();

  registerDomain = vi.fn(
    (
      _domain: ExtensionDomain,
      _containerProvider: ContainerProvider,
      _options?: RegisterDomainOptions
    ) => undefined
  );

  unregisterDomain = vi.fn(async (_domainId: string) => undefined);

  registerExtension = vi.fn(async (_extension: Extension) => undefined);

  unregisterExtension = vi.fn(async (_extensionId: string) => undefined);

  updateSharedProperty = vi.fn(
    (_propertyId: string, _value: unknown) => undefined
  );

  getDomainProperty = vi.fn(
    (_domainId: string, _propertyTypeId: string) => undefined
  );

  executeActionsChain = vi.fn(async (_chain: ActionsChain) => undefined);

  triggerLifecycleStage = vi.fn(
    async (_extensionId: string, _stageId: string) => undefined
  );

  triggerDomainLifecycleStage = vi.fn(
    async (_domainId: string, _stageId: string) => undefined
  );

  triggerDomainOwnLifecycleStage = vi.fn(
    async (_domainId: string, _stageId: string) => undefined
  );

  getExtension = vi.fn((_extensionId: string) => undefined);

  getDomain = vi.fn((_domainId: string) => undefined);

  getExtensionsForDomain = vi.fn((_domainId: string) => [] as Extension[]);

  getMountedExtension = vi.fn((_domainId: string) => undefined);

  getRegisteredPackages = vi.fn(() => [] as string[]);

  getExtensionsForPackage = vi.fn((_packageId: string) => [] as Extension[]);

  getParentBridge = vi.fn(
    (_extensionId: string) => null as ParentMfeBridge | null
  );

  setTheme = vi.fn((_cssVars: Record<string, string>) => undefined);

  dispose = vi.fn(() => undefined);
}
// @cpt-end:cpt-frontx-dod-mfe-registry-handler-injection:p1:inst-minimal-registry-stub
