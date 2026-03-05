/**
 * MFE Registry
 *
 * Centralized configuration for all Microfrontend packages.
 * Add new MFEs here to register them with the HAI3 app.
 *
 * Each MFE must have:
 * - src/mfe_packages/{name}-mfe/mfe.json (manifest, entries, extensions)
 * - src/mfe_packages/{name}-mfe/package.json (with dev script)
 * - src/mfe_packages/{name}-mfe/vite.config.ts (Module Federation config)
 */

/**
 * MFE Configuration
 * @typedef {Object} MFEConfig
 * @property {string} name - Package name (must match folder name)
 * @property {number} port - Dev server port (3001, 3010, 3020, etc)
 * @property {boolean} enabled - Whether to load this MFE
 * @property {string} description - Human-readable description
 */

export interface MFERegistryEntry {
  name: string;
  port: number;
  enabled: boolean;
  description: string;
}

/**
 * MFE Registry - add all MFEs here
 *
 * Port allocation:
 * - 3001+: MFE packages
 */
export const MFE_REGISTRY: MFERegistryEntry[] = [
  // Add your MFEs here. See .ai/commands/user/hai3-add-mfe-to-registry.md
];

/**
 * Get enabled MFE names for dev:all script
 * Usage in package.json:
 *   "dev:all": "concurrently --kill-others \"npm run dev:mfe:demo\" \"npm run dev\""
 */
export function getEnabledMFENames(): string[] {
  return MFE_REGISTRY.filter((mfe) => mfe.enabled).map((mfe) =>
    mfe.name.replace('-mfe', '')
  );
}

/**
 * Get all registered MFE packages (enabled + disabled)
 * Usage in bootstrap.ts:
 *   const allMFEs = getAllMFEPackages();
 */
export function getAllMFEPackages(): MFERegistryEntry[] {
  return MFE_REGISTRY;
}

/**
 * Get MFE config by name
 */
export function getMFEConfig(name: string): MFERegistryEntry | undefined {
  return MFE_REGISTRY.find((mfe) => mfe.name === name);
}
