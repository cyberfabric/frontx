/**
 * Unit tests for the @cyberfabric/framework/testing subpath.
 *
 * Scope: pure-unit coverage for utilities that live at L2 and do not cross
 * package boundaries. The contract helper below uses local fixtures so this
 * package verifies its own Vitest-only bootstrap helper without reaching into
 * downstream app packages.
 *
 * @vitest-environment jsdom
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  describeBootstrapMfeContract,
  TestContainerProvider,
} from '../src/testing';

function resolveFixturePath(relativePath: string): string {
  if (import.meta.url.startsWith('file:')) {
    return fileURLToPath(new URL(relativePath, import.meta.url));
  }

  const schemeStripped = import.meta.url.replace(/^[a-z][a-z0-9+.-]*:(?:\/\/)?/i, '/');
  const withoutSearch = schemeStripped.split(/[?#]/, 1)[0] ?? schemeStripped;
  return path.resolve(path.dirname(withoutSearch), relativePath);
}

describeBootstrapMfeContract({
  suiteName: 'describeBootstrapMfeContract (default resolver)',
  bootstrapModulePath: './fixtures/bootstrap-contract/bootstrap.fixture.ts',
  manifestsModulePath: './fixtures/bootstrap-contract/generated-mfe-manifests.fixture.ts',
  callerUrl: import.meta.url,
  reactModulePath: resolveFixturePath('./fixtures/bootstrap-contract/react-bridge.fixture.ts'),
});

describeBootstrapMfeContract({
  suiteName: 'describeBootstrapMfeContract (custom resolver)',
  bootstrapModulePath: 'virtual:bootstrap-contract',
  manifestsModulePath: 'virtual:bootstrap-manifests',
  reactModulePath: resolveFixturePath('./fixtures/bootstrap-contract/react-bridge.fixture.ts'),
  resolveModule: ({ specifier }) => {
    if (specifier === 'virtual:bootstrap-contract') {
      return resolveFixturePath('./fixtures/bootstrap-contract/bootstrap.custom-react.fixture.ts');
    }

    if (specifier === 'virtual:bootstrap-manifests') {
      return resolveFixturePath('./fixtures/bootstrap-contract/generated-mfe-manifests.fixture.ts');
    }

    throw new Error(`Unexpected test fixture specifier: ${specifier}`);
  },
});

describe('describeBootstrapMfeContract', () => {
  it('throws when callerUrl is omitted without a custom resolver', () => {
    expect(() =>
      describeBootstrapMfeContract({
        suiteName: 'missing callerUrl',
        bootstrapModulePath: './fixtures/bootstrap-contract/bootstrap.fixture.ts',
        manifestsModulePath: './fixtures/bootstrap-contract/generated-mfe-manifests.fixture.ts',
      }),
    ).toThrow(
      "describeBootstrapMfeContract: 'callerUrl' is required when no 'resolveModule' is provided",
    );
  });
});

describe('TestContainerProvider', () => {
  it('returns the provided container instance', () => {
    const container = document.createElement('section');
    const provider = new TestContainerProvider(container);

    expect(provider.getContainer('demo')).toBe(container);
  });

  it('creates a div container when document is available', () => {
    const provider = new TestContainerProvider();
    const host = provider.getContainer('demo');

    expect(host instanceof HTMLElement).toBe(true);
    expect(host.tagName).toBe('DIV');
  });

  it('falls back to a lightweight container object when document is unavailable', () => {
    const originalDocument = globalThis.document;
    vi.stubGlobal('document', undefined);

    try {
      const provider = new TestContainerProvider();
      expect(provider.getContainer('demo')).toEqual({ tagName: 'DIV' });
    } finally {
      vi.stubGlobal('document', originalDocument);
    }
  });

  it('treats releaseContainer as a no-op', () => {
    const provider = new TestContainerProvider(document.createElement('div'));

    expect(() => {
      provider.releaseContainer('demo');
    }).not.toThrow();
  });
});
