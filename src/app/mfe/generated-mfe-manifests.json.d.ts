// Types for `generated-mfe-manifests.json` (gitignored; produced by
// `npm run generate:mfe-manifests`). TypeScript bundler resolution pairs this
// with the .json import via the `*.json.d.ts` naming convention.

declare const data: Array<{
  manifest: import('@cyberfabric/react').MfManifest;
  entries: import('@cyberfabric/react').MfeEntryMF[];
  extensions: import('@cyberfabric/react').Extension[];
  schemas?: import('@cyberfabric/react').JSONSchema[];
}>;

export default data;
