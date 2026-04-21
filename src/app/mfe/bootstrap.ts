// @cpt-flow:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2

/**
 * MFE Bootstrap
 *
 * Registers MFE domains, extensions, and handlers with the FrontX app.
 *
 * MFE manifest configs are loaded from generated-mfe-manifests.json, produced by
 * the generation script. The script accepts --base-url for deployment-specific URLs.
 */

import type { RefObject } from 'react';
import type {
  HAI3App,
  Extension,
  MfManifest,
  MfeEntryMF,
  JSONSchema,
  ScreensetsRegistry,
} from '@cyberfabric/react';
import { bootstrapMfeDomains } from '@cyberfabric/react';
import MFE_MANIFESTS from './generated-mfe-manifests.json';

/**
 * Shape of each MFE manifest config in the generated JSON.
 * Matches the output of scripts/generate-mfe-manifests.ts.
 */
interface MfeManifestConfig {
  manifest: MfManifest;
  entries: MfeEntryMF[];
  extensions: Extension[];
  schemas?: JSONSchema[];
}

// @cpt-begin:cpt-frontx-dod-screenset-registry-mfe-schema-registration:p1:inst-1
/**
 * Scoped schema registration: only register schemas whose $id matches an action ID
 * declared by at least one entry in this package. Orphan schemas (not referenced by
 * any entry's `actions` or `domainActions`) are skipped — they cannot be dispatched
 * safely because no entry opts in to send or receive them at runtime.
 */
function collectDeclaredActionIds(entries: MfeEntryMF[]): Set<string> {
  const declaredActionIds = new Set<string>();
  for (const entry of entries) {
    for (const actionId of entry.actions) declaredActionIds.add(actionId);
    for (const actionId of entry.domainActions) declaredActionIds.add(actionId);
  }
  return declaredActionIds;
}

function registerScopedSchemas(
  registry: ScreensetsRegistry,
  schemas: JSONSchema[],
  declaredActionIds: Set<string>,
): void {
  for (const schema of schemas) {
    const schemaId = schema.$id;
    if (!schemaId) continue;
    const matches = Array.from(declaredActionIds).some((actionId) =>
      schemaId.includes(actionId),
    );
    if (matches) {
      registry.typeSystem.registerSchema(schema);
    }
  }
}
// @cpt-end:cpt-frontx-dod-screenset-registry-mfe-schema-registration:p1:inst-1

async function registerMfePackage(
  registry: ScreensetsRegistry,
  config: MfeManifestConfig,
): Promise<void> {
  if (config.schemas) {
    registerScopedSchemas(registry, config.schemas, collectDeclaredActionIds(config.entries));
  }
  // register() validates each instance against its schema and throws on
  // failure — invalid manifests/entries fail startup loudly rather than
  // persisting broken state into the registry.
  registry.typeSystem.register(config.manifest);
  for (const entry of config.entries) {
    registry.typeSystem.register({ ...entry, manifest: config.manifest });
  }
  for (const extension of config.extensions) {
    await registry.registerExtension(extension);
  }
}

/**
 * Bootstrap MFE system for the host application.
 * Registers domains, extensions, and shared properties.
 * Mount/unmount lifecycle is delegated to ExtensionDomainSlot in MfeScreenContainer.
 *
 * MFE manifest configs are loaded from `generated-mfe-manifests.json`, produced
 * by the generation script (`npm run generate:mfe-manifests`). The script
 * accepts `--base-url` to set deployment-specific URLs for dev vs prod.
 *
 * @param app - FrontX application instance
 * @param screenContainerRef - React ref for the screen domain container element
 */
// @cpt-begin:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-bootstrap-mfe
export async function bootstrapMFE(
  app: HAI3App,
  screenContainerRef: RefObject<HTMLDivElement | null>,
): Promise<void> {
  const screensetsRegistry = await bootstrapMfeDomains(app, screenContainerRef);

  if (MFE_MANIFESTS.length === 0) {
    console.warn(
      '[MFE Bootstrap] No MFE manifests found. Run `npm run generate:mfe-manifests` to generate them.',
    );
    return;
  }

  const manifests = MFE_MANIFESTS as MfeManifestConfig[];
  for (const config of manifests) {
    await registerMfePackage(screensetsRegistry, config);
  }
}
// @cpt-end:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-bootstrap-mfe
