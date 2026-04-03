import { describe, expect, it } from 'vitest';
import {
  RestEndpointProtocol,
  RestProtocol,
  SseProtocol,
  SseStreamProtocol,
} from '../src';

describe('@cyberfabric/react API protocol re-exports', () => {
  it('re-exports descriptor protocol classes needed by MFE-local services', () => {
    const restEndpoints = new RestEndpointProtocol(new RestProtocol());
    const sseStreams = new SseStreamProtocol(new SseProtocol());

    expect(typeof restEndpoints.query).toBe('function');
    expect(typeof restEndpoints.queryWith).toBe('function');
    expect(typeof restEndpoints.mutation).toBe('function');
    expect(typeof sseStreams.stream).toBe('function');
  });
});
