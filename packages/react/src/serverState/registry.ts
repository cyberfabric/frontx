import type { ServerStateReactAdapter } from './types';
// @cpt-dod:cpt-frontx-dod-request-lifecycle-query-provider:p2

const serverStateReactAdapters = new Map<string, ServerStateReactAdapter>();

export function registerServerStateReactAdapter(adapter: ServerStateReactAdapter): void {
  serverStateReactAdapters.set(adapter.adapterId, adapter);
}

export function getServerStateReactAdapter(
  adapterId: string
): ServerStateReactAdapter | undefined {
  return serverStateReactAdapters.get(adapterId);
}
