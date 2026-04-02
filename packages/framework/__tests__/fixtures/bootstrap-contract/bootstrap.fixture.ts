import { bootstrapMfeDomains } from './react-bridge.fixture';
import { MFE_MANIFESTS, type MfeManifestConfig } from './generated-mfe-manifests.fixture';

type Extension = Record<string, unknown>;
type ScreenExtension = Extension & {
  presentation?: {
    route?: string;
  };
};

function isScreenExtension(extension: Extension): extension is ScreenExtension {
  const presentation = extension.presentation;

  return typeof presentation === 'object' &&
    presentation !== null &&
    'route' in presentation &&
    typeof presentation.route === 'string';
}

export async function bootstrapMFE(
  app: unknown,
  screenContainerRef: { current: HTMLDivElement | null },
): Promise<ScreenExtension[]> {
  const screensetsRegistry = await bootstrapMfeDomains(app, screenContainerRef);

  if (MFE_MANIFESTS.length === 0) {
    console.warn('[MFE Bootstrap] No MFE manifests found.');
    return [];
  }

  const screenExtensions: ScreenExtension[] = [];

  for (const config of MFE_MANIFESTS as MfeManifestConfig[]) {
    if (config.schemas) {
      for (const schema of config.schemas) {
        screensetsRegistry.typeSystem.registerSchema(schema);
      }
    }

    screensetsRegistry.typeSystem.register(config.manifest);

    for (const entry of config.entries) {
      screensetsRegistry.typeSystem.register({ ...entry, manifest: config.manifest });
    }

    for (const extension of config.extensions) {
      await screensetsRegistry.registerExtension(extension);
    }

    screenExtensions.push(...config.extensions.filter(isScreenExtension));
  }

  if (screenExtensions.length === 0) {
    console.warn('[MFE Bootstrap] No screen extensions available, skipping mount');
    return [];
  }

  return screenExtensions;
}
