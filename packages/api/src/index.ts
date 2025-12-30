/**
 * @hai3/api - API Communication
 *
 * This package provides:
 * - API service interface and registry
 * - REST and SSE protocol support
 * - Plugin system for request/response modification
 * - Mock data support for testing
 *
 * SDK Layer: L1 (Zero @hai3 dependencies)
 */

// Re-export all types
export type {
  JsonPrimitive,
  JsonValue,
  JsonObject,
  JsonCompatible,
  MockResponseFactory,
  MockMap,
  ApiServiceConfig,
  ApiServicesConfig,
  ApiProtocol,
  RestProtocolConfig,
  SseProtocolConfig,
  ApiRequestContext,
  ApiResponseContext,
  ShortCircuitResponse,
  ApiService,
  ServiceConstructor,
  ApiRegistry,
  PluginClass,
} from './types';

// Export plugin classes and functions
export { ApiPluginBase, ApiPlugin, isShortCircuit } from './types';

// Export base service class
export { BaseApiService } from './BaseApiService';

// Export protocols
export { RestProtocol } from './protocols/RestProtocol';
export { SseProtocol } from './protocols/SseProtocol';

// Export plugins
export { MockPlugin } from './plugins/MockPlugin';
export type { MockPluginConfig } from './plugins/MockPlugin';

// Export registry
export { apiRegistry, createApiRegistry } from './apiRegistry';
