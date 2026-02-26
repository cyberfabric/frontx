/**
 * Home Domain - Events
 * Replace event names with your domain events.
 */

declare module '@hai3/react' {
  interface EventPayloadMap {
    'mfe/home/data-fetch-requested': undefined;
    'mfe/home/data-fetched': { data: Record<string, string> };
    'mfe/home/data-fetch-failed': { error: string };
  }
}
