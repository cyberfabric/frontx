#!/usr/bin/env node
/**
 * Telemetry Contract Check — validates event schema in poc-events.json.
 *
 * Ensures telemetry events follow required structure, namespace conventions,
 * and size limits defined by the data contracts.
 *
 * Usage: node tools/telemetry-validator/contract-check.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.join(root, 'tools/telemetry-validator/poc-events.json');

if (!fs.existsSync(file)) {
  console.error('Missing tools/telemetry-validator/poc-events.json');
  process.exit(1);
}

const events = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!Array.isArray(events) || events.length === 0) {
  console.error('poc-events.json must contain a non-empty array');
  process.exit(1);
}

const requiredTop = ['v', 't', 'ts', 'sid', 'rid', 'p'];
const allowedPrefix = ['ui.', 'net.', 'runtime.'];
const MAX_EVENT_SIZE_BYTES = 8192;
const errors = [];

const payloadSchemas = {
  'ui.done_rendering': { required: ['durationMs', 'method'], types: { durationMs: 'number', method: 'string' } },
  'ui.route_transition': { required: ['toRouteId', 'navigationMs', 'transitionType'], types: { navigationMs: 'number', transitionType: 'string', toRouteId: 'string' } },
  'ui.action_span': { required: ['actionName', 'durationMs', 'status'], types: { actionName: 'string', durationMs: 'number', status: 'string' } },
  'net.http.client': { required: ['endpointTemplate', 'status', 'durationMs'], types: { endpointTemplate: 'string', status: 'number', durationMs: 'number' } },
  'runtime.queue.flush': { required: ['batchSize', 'uploadMs'], types: { batchSize: 'number', uploadMs: 'number' } },
  'runtime.error': { required: ['source', 'message', 'fatal'], types: { source: 'string', message: 'string', fatal: 'boolean' } },
};

for (const [i, event] of events.entries()) {
  for (const key of requiredTop) {
    if (!(key in event)) errors.push(`event[${i}] missing key '${key}'`);
  }

  if (typeof event.t !== 'string' || !allowedPrefix.some((p) => event.t.startsWith(p))) {
    errors.push(`event[${i}] invalid namespace for t='${event.t}'`);
  }

  if (typeof event.ts !== 'number') {
    errors.push(`event[${i}] ts must be number`);
  }

  if (typeof event.v !== 'string') {
    errors.push(`event[${i}] v must be string (semver)`);
  }

  if (typeof event.sid !== 'string' || event.sid.length === 0) {
    errors.push(`event[${i}] sid must be non-empty string`);
  }

  if (typeof event.rid !== 'string' || event.rid.length === 0) {
    errors.push(`event[${i}] rid must be non-empty string`);
  }

  if (typeof event.p !== 'object' || event.p === null) {
    errors.push(`event[${i}] p must be object`);
  }

  const eventJson = JSON.stringify(event);
  if (Buffer.byteLength(eventJson, 'utf8') > MAX_EVENT_SIZE_BYTES) {
    errors.push(`event[${i}] exceeds max size of ${MAX_EVENT_SIZE_BYTES} bytes`);
  }

  const schema = payloadSchemas[event.t];
  if (schema && typeof event.p === 'object' && event.p !== null) {
    for (const field of schema.required) {
      if (!(field in event.p)) {
        errors.push(`event[${i}] payload missing required field '${field}' for type '${event.t}'`);
      }
    }
    for (const [field, expectedType] of Object.entries(schema.types)) {
      if (field in event.p && typeof event.p[field] !== expectedType) {
        errors.push(`event[${i}] payload field '${field}' should be ${expectedType}, got ${typeof event.p[field]}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('\nTelemetry contract check failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Telemetry contract check passed (${events.length} events validated).`);
