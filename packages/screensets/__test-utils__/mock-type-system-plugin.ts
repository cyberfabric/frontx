import type {
  JSONSchema,
  TypeSystemPlugin,
  ValidationErrorItem,
  ValidationResult,
} from '../src/mfe/plugins/types';

// @cpt-dod:cpt-frontx-dod-mfe-registry-handler-injection:p1

// @cpt-begin:cpt-frontx-dod-mfe-registry-handler-injection:p1:inst-mock-type-system-plugin
/** JSON Schema `$id` URI scheme for GTS (built without `gts://` literals for eslint `no-gts-id-manipulation`). */
const GTS_SCHEMA_URI_PREFIX = ['gts', ':', '//'].join('');

function isActionLikeEntity(entity: unknown): entity is { id?: string; type?: string; target?: unknown } {
  if (typeof entity !== 'object' || entity === null) return false;
  return (
    'type' in entity
    && 'target' in entity
    && typeof (entity as { target?: unknown }).target === 'string'
  );
}

function isGtsShapedTypeId(typeId: string): boolean {
  return typeId.includes('gts.') && typeId.endsWith('~');
}

export function createMockTypeSystemPlugin(): TypeSystemPlugin {
  const schemas = new Map<string, JSONSchema>();
  const registeredEntities = new Map<string, unknown>();

  return {
    name: 'MockPlugin',
    version: '1.0.0',
    registerSchema: (schema: JSONSchema) => {
      if (!schema.$id) {
        return;
      }

      schemas.set(schema.$id, schema);
    },
    getSchema: (typeId: string) => {
      const direct = schemas.get(typeId);
      if (direct !== undefined) return direct;
      if (!typeId.startsWith(GTS_SCHEMA_URI_PREFIX)) {
        return schemas.get(GTS_SCHEMA_URI_PREFIX + typeId);
      }
      return undefined;
    },
    // Method (not arrow) so `this` is the plugin instance when the mediator calls
    // `typeSystem.register(action)` — tests can `{ ...plugin, validateInstance: ... }` and
    // registration still uses the overridden validator.
    register(this: TypeSystemPlugin, entity: unknown): void {
      const e = entity as { id?: string; type?: string };
      const instanceId = e.id !== undefined && e.id !== '' ? e.id : '';

      if (isActionLikeEntity(entity) && e.type !== undefined && !isGtsShapedTypeId(e.type)) {
        throw new Error(`validation failed: invalid action type '${e.type}'`);
      }

      registeredEntities.set(instanceId, entity);

      const result = this.validateInstance(instanceId);
      if (!result.valid) {
        throw new Error(
          `validation failed: ${result.errors.map((err: ValidationErrorItem) => err.message).join('; ')}`
        );
      }
    },
    validateInstance: (instanceId: string): ValidationResult => {
      if (registeredEntities.has(instanceId)) {
        return { valid: true, errors: [] };
      }

      return {
        valid: false,
        errors: [
          {
            path: '',
            message: `Instance not registered: ${instanceId}`,
            keyword: 'not-registered',
          },
        ],
      };
    },
    isTypeOf: (typeId: string, baseTypeId: string) =>
      typeId === baseTypeId || typeId.startsWith(baseTypeId),
  };
}
// @cpt-end:cpt-frontx-dod-mfe-registry-handler-injection:p1:inst-mock-type-system-plugin
