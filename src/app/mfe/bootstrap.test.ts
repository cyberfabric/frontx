import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeBootstrapMfeContract } from '@cyberfabric/react/testing';

function resolveTestFile(relativePath: string): string {
  if (import.meta.url.startsWith('file:')) {
    return fileURLToPath(new URL(relativePath, import.meta.url));
  }

  const schemeStripped = import.meta.url.replace(/^[a-z][a-z0-9+.-]*:(?:\/\/)?/i, '/');
  const withoutSearch = schemeStripped.split(/[?#]/, 1)[0] ?? schemeStripped;
  return path.resolve(path.dirname(withoutSearch), relativePath);
}

const generatedManifestPath = resolveTestFile('./generated-mfe-manifests.json');

if (!existsSync(generatedManifestPath)) {
  writeFileSync(generatedManifestPath, '[]\n');
}

describeBootstrapMfeContract({
  suiteName: 'bootstrapMFE',
  bootstrapModulePath: './bootstrap.ts',
  manifestsModulePath: './generated-mfe-manifests.json',
  callerUrl: import.meta.url,
});
