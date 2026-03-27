import type { QueryClient } from '@tanstack/react-query';
import type { ActionsChain, ScreensetsRegistry } from '@hai3/framework';
import { HAI3_ACTION_MOUNT_EXT } from '@hai3/framework';

type MountContextRegistry = Pick<
  ScreensetsRegistry,
  'setExtensionMountContext' | 'clearExtensionMountContext'
>;

type ActionsChainExecutor = (chain: ActionsChain) => Promise<void>;

/**
 * Wrap a lifecycle chain with host-provided mount context for mount_ext actions.
 *
 * This keeps shared QueryClient injection consistent across all host-driven mount
 * paths (ExtensionDomainSlot, menu navigation, browser navigation, etc.).
 */
export async function executeActionsChainWithMountContext(
  registry: MountContextRegistry,
  chain: ActionsChain,
  queryClient: QueryClient,
  executeChain: ActionsChainExecutor,
): Promise<void> {
  const extensionId = chain.action.payload?.extensionId;
  const isMountAction = (
    chain.action.type === HAI3_ACTION_MOUNT_EXT &&
    typeof extensionId === 'string'
  );

  if (!isMountAction) {
    await executeChain(chain);
    return;
  }

  registry.setExtensionMountContext(extensionId, {
    queryClient,
    extensionId,
    domainId: chain.action.target,
  });

  try {
    await executeChain(chain);
  } finally {
    registry.clearExtensionMountContext(extensionId);
  }
}
