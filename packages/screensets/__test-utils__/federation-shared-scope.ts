import type { FederationSharedMap } from '../src/mfe/handler/federation-types';

// @cpt-dod:cpt-frontx-dod-mfe-registry-handler-injection:p1

type GlobalWithFederation = typeof globalThis & {
  __federation_shared__?: FederationSharedMap;
};

// @cpt-begin:cpt-frontx-dod-mfe-registry-handler-injection:p1:inst-federation-shared-scope
function accessFederationSharedScope(
  value?: FederationSharedMap
): FederationSharedMap | undefined {
  const federationHost = globalThis as GlobalWithFederation;

  if (arguments.length === 1) {
    federationHost.__federation_shared__ = value;
  }

  return federationHost.__federation_shared__;
}

export function readFederationSharedScope(): FederationSharedMap | undefined {
  return accessFederationSharedScope();
}

export function writeFederationSharedScope(value: FederationSharedMap): void {
  accessFederationSharedScope(value);
}

export function clearFederationSharedScope(): void {
  const federationHost = globalThis as GlobalWithFederation;
  delete federationHost.__federation_shared__;
}
// @cpt-end:cpt-frontx-dod-mfe-registry-handler-injection:p1:inst-federation-shared-scope
