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
import type { HAI3App, Extension, ScreenExtension, MfManifest, MfeEntryMF, JSONSchema } from '@cyberfabric/react';
import { bootstrapMfeDomains } from '@cyberfabric/react';
import MFE_MANIFESTS from './generated-mfe-manifests.json';

/**
 * Shape of each MFE manifest config in the generated JSON.
 * Matches the output of scripts/generate-mfe-manifests.ts.
 */
interface MfeManifestConfig {
  manifest: MfManifest;
  entries: MfeEntryMF[];
  extensions: (Extension | ScreenExtension)[];
  schemas?: JSONSchema[];
}

// @cpt-begin:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-is-screen-extension
function isScreenExtension(extension: Extension): extension is ScreenExtension {
  const candidate = extension as { presentation?: { route?: string } };
  return typeof candidate.presentation?.route === 'string';
}
// @cpt-end:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-is-screen-extension

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
 * @returns Array of registered screen extensions, for URL routing in MfeScreenContainer
 */
// @cpt-begin:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-bootstrap-mfe
export async function bootstrapMFE(
  app: HAI3App,
  screenContainerRef: RefObject<HTMLDivElement | null>,
): Promise<ScreenExtension[]> {
  const screensetsRegistry = await bootstrapMfeDomains(app, screenContainerRef);

  if (MFE_MANIFESTS.length === 0) {
    console.warn('[MFE Bootstrap] No MFE manifests found. Run `npm run generate:mfe-manifests` to generate them.');
    return [];
  }

  const manifests = MFE_MANIFESTS as MfeManifestConfig[];
  const screenExtensions: ScreenExtension[] = [];

  for (const config of manifests) {
    // @cpt-begin:cpt-frontx-dod-screenset-registry-mfe-schema-registration:p1:inst-1
    // Scoped schema registration: only register schemas whose $id matches an action ID
    // declared by at least one entry in this package. Orphan schemas (not referenced by
    // any entry's `actions` or `domainActions`) are skipped — they cannot be dispatched
    // safely because no entry opts in to send or receive them at runtime.
    if (config.schemas) {
      const declaredActionIds = new Set<string>();
      for (const entry of config.entries) {
        for (const actionId of entry.actions) declaredActionIds.add(actionId);
        for (const actionId of entry.domainActions) declaredActionIds.add(actionId);
      }

      for (const schema of config.schemas) {
        if (!schema.$id) continue;
        const actionId = schema.$id.replace(/^gts:\/\//, '');
        if (declaredActionIds.has(actionId)) {
          screensetsRegistry.typeSystem.registerSchema(schema);
        }
      }
    }
    // @cpt-end:cpt-frontx-dod-screenset-registry-mfe-schema-registration:p1:inst-1

    // Register and validate manifest instance against GTS schema
    screensetsRegistry.typeSystem.register(config.manifest);
    const manifestValidation = screensetsRegistry.typeSystem.validateInstance(config.manifest.id);
    if (!manifestValidation.valid) {
      console.error(
        `[MFE Bootstrap] Manifest '${config.manifest.id}' failed GTS validation:`,
        JSON.stringify(manifestValidation.errors, null, 2)
      );
    }

    for (const entry of config.entries) {
      screensetsRegistry.typeSystem.register({ ...entry, manifest: config.manifest });
    }

    for (const extension of config.extensions) {
      await screensetsRegistry.registerExtension(extension);
    }

    screenExtensions.push(...config.extensions.filter(isScreenExtension));
  }

  return screenExtensions;
}
// @cpt-end:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-bootstrap-mfe
