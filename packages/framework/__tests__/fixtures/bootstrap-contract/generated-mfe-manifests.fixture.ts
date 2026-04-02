export type MfeManifestConfig = {
  manifest: Record<string, unknown>;
  entries: Array<Record<string, unknown>>;
  extensions: Array<Record<string, unknown>>;
  schemas?: Array<Record<string, unknown>>;
};

export const MFE_MANIFESTS: MfeManifestConfig[] = [];
