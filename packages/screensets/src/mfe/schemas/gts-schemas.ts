/**
 * GTS JSON Schema definitions for HAI3 MFE types
 *
 * These schemas define the structure and validation rules for all MFE system types.
 * They are built into the GTS plugin - no registration required.
 *
 * @packageDocumentation
 */

import type { JSONSchema } from '../plugins/types';

/**
 * Core Type Schemas (8 types)
 */

/**
 * MFE Entry Schema (Abstract Base)
 * Pure contract type for all MFE entries
 */
export const mfeEntrySchema: JSONSchema = {
  $id: 'gts://gts.hai3.screensets.mfe.entry.v1~',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    id: {
      'x-gts-ref': '/$id',
      $comment: 'The GTS type ID for this instance',
    },
    requiredProperties: {
      type: 'array',
      items: { 'x-gts-ref': 'gts.hai3.screensets.ext.shared_property.v1~*' },
      $comment: 'SharedProperty type IDs that MUST be provided by the domain',
    },
    optionalProperties: {
      type: 'array',
      items: { 'x-gts-ref': 'gts.hai3.screensets.ext.shared_property.v1~*' },
      $comment: 'SharedProperty type IDs that MAY be provided by the domain',
    },
    actions: {
      type: 'array',
      items: { 'x-gts-ref': 'gts.hai3.screensets.ext.action.v1~*' },
      $comment: 'Action type IDs this MFE can send (when targeting its domain)',
    },
    domainActions: {
      type: 'array',
      items: { 'x-gts-ref': 'gts.hai3.screensets.ext.action.v1~*' },
      $comment: 'Action type IDs this MFE can receive (when targeted by actions chains)',
    },
  },
  required: ['id', 'requiredProperties', 'actions', 'domainActions'],
};

/**
 * Extension Domain Schema
 * Defines an extension point where MFEs can be mounted
 */
export const extensionDomainSchema: JSONSchema = {
  $id: 'gts://gts.hai3.screensets.ext.domain.v1~',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    id: {
      'x-gts-ref': '/$id',
      $comment: 'The GTS type ID for this instance',
    },
    sharedProperties: {
      type: 'array',
      items: { 'x-gts-ref': 'gts.hai3.screensets.ext.shared_property.v1~*' },
    },
    actions: {
      type: 'array',
      items: { 'x-gts-ref': 'gts.hai3.screensets.ext.action.v1~*' },
      $comment: 'Action type IDs that can target extensions in this domain',
    },
    extensionsActions: {
      type: 'array',
      items: { 'x-gts-ref': 'gts.hai3.screensets.ext.action.v1~*' },
      $comment: 'Action type IDs extensions can send when targeting this domain',
    },
    extensionsUiMetaTypeId: {
      type: 'string',
      $comment: 'Optional GTS type ID reference for extension uiMeta schema validation. Uses standard plugin.validateInstance(typeId, instance).',
    },
    defaultActionTimeout: {
      type: 'number',
      minimum: 1,
      $comment: 'Default timeout in milliseconds for actions targeting this domain. REQUIRED.',
    },
    lifecycleStages: {
      type: 'array',
      items: { 'x-gts-ref': 'gts.hai3.screensets.ext.lifecycle_stage.v1~*' },
      $comment:
        'Lifecycle stage type IDs supported for the domain itself. Hooks referencing unsupported stages are rejected during validation.',
    },
    extensionsLifecycleStages: {
      type: 'array',
      items: { 'x-gts-ref': 'gts.hai3.screensets.ext.lifecycle_stage.v1~*' },
      $comment:
        'Lifecycle stage type IDs supported for extensions in this domain. Extension hooks referencing unsupported stages are rejected during validation.',
    },
    lifecycle: {
      type: 'array',
      items: { type: 'object', $ref: 'gts://gts.hai3.screensets.ext.lifecycle_hook.v1~' },
      $comment: 'Optional lifecycle hooks - explicitly declared actions for each stage',
    },
  },
  required: [
    'id',
    'sharedProperties',
    'actions',
    'extensionsActions',
    'defaultActionTimeout',
    'lifecycleStages',
    'extensionsLifecycleStages',
  ],
};

/**
 * Extension Schema
 * Binds an MFE entry to a domain
 */
export const extensionSchema: JSONSchema = {
  $id: 'gts://gts.hai3.screensets.ext.extension.v1~',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    id: {
      'x-gts-ref': '/$id',
      $comment: 'The GTS type ID for this instance',
    },
    domain: {
      'x-gts-ref': 'gts.hai3.screensets.ext.domain.v1~*',
      $comment: 'ExtensionDomain type ID to mount into',
    },
    entry: {
      'x-gts-ref': 'gts.hai3.screensets.mfe.entry.v1~*',
      $comment: 'MfeEntry type ID to mount',
    },
    uiMeta: {
      type: 'object',
      $comment: "Optional UI metadata. If domain has extensionsUiMetaTypeId, this must conform to that schema.",
    },
    lifecycle: {
      type: 'array',
      items: { type: 'object', $ref: 'gts://gts.hai3.screensets.ext.lifecycle_hook.v1~' },
      $comment: 'Optional lifecycle hooks - explicitly declared actions for each stage',
    },
  },
  required: ['id', 'domain', 'entry'],
};

/**
 * Shared Property Schema
 * Represents a typed value passed from host to MFE
 */
export const sharedPropertySchema: JSONSchema = {
  $id: 'gts://gts.hai3.screensets.ext.shared_property.v1~',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    id: {
      'x-gts-ref': '/$id',
      $comment: 'The GTS type ID for this shared property',
    },
    value: {
      $comment: 'The shared property value',
    },
  },
  required: ['id', 'value'],
};

/**
 * Action Schema
 * A typed message with target and optional payload
 */
export const actionSchema: JSONSchema = {
  $id: 'gts://gts.hai3.screensets.ext.action.v1~',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    type: {
      'x-gts-ref': '/$id',
      $comment: "Self-reference to this action's type ID",
    },
    target: {
      type: 'string',
      oneOf: [
        { 'x-gts-ref': 'gts.hai3.screensets.ext.domain.v1~*' },
        { 'x-gts-ref': 'gts.hai3.screensets.ext.extension.v1~*' },
      ],
      $comment: 'Type ID of the target ExtensionDomain or Extension',
    },
    payload: {
      type: 'object',
      $comment: 'Optional action payload',
    },
    timeout: {
      type: 'number',
      minimum: 1,
      $comment: 'Optional timeout override in milliseconds',
    },
  },
  required: ['type', 'target'],
};

/**
 * Actions Chain Schema
 * A linked structure of actions with success/failure branches
 */
export const actionsChainSchema: JSONSchema = {
  $id: 'gts://gts.hai3.screensets.ext.actions_chain.v1~',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    action: {
      type: 'object',
      $ref: 'gts://gts.hai3.screensets.ext.action.v1~',
    },
    next: {
      type: 'object',
      $ref: 'gts://gts.hai3.screensets.ext.actions_chain.v1~',
    },
    fallback: {
      type: 'object',
      $ref: 'gts://gts.hai3.screensets.ext.actions_chain.v1~',
    },
  },
  required: ['action'],
};

/**
 * Lifecycle Stage Schema
 * Represents a lifecycle event that can trigger actions chains
 */
export const lifecycleStageSchema: JSONSchema = {
  $id: 'gts://gts.hai3.screensets.ext.lifecycle_stage.v1~',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    id: {
      'x-gts-ref': '/$id',
      $comment: 'The GTS type ID for this lifecycle stage',
    },
    description: {
      type: 'string',
      $comment: 'Human-readable description of when this stage triggers',
    },
  },
  required: ['id'],
};

/**
 * Lifecycle Hook Schema
 * Binds a lifecycle stage to an actions chain
 */
export const lifecycleHookSchema: JSONSchema = {
  $id: 'gts://gts.hai3.screensets.ext.lifecycle_hook.v1~',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    stage: {
      'x-gts-ref': 'gts.hai3.screensets.ext.lifecycle_stage.v1~*',
      $comment: 'The lifecycle stage that triggers this hook',
    },
    actions_chain: {
      type: 'object',
      $ref: 'gts://gts.hai3.screensets.ext.actions_chain.v1~',
      $comment: 'The actions chain to execute when the stage triggers',
    },
  },
  required: ['stage', 'actions_chain'],
};

/**
 * Default Lifecycle Stage Schemas (4 stages)
 */

/**
 * Init Lifecycle Stage - After registration
 */
export const lifecycleStageInitSchema: JSONSchema = {
  $id: 'gts://gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.init.v1~',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  allOf: [{ $ref: 'gts://gts.hai3.screensets.ext.lifecycle_stage.v1~' }],
  properties: {
    description: {
      type: 'string',
      const: 'Triggered after extension registration',
    },
  },
};

/**
 * Activated Lifecycle Stage - After mount
 */
export const lifecycleStageActivatedSchema: JSONSchema = {
  $id: 'gts://gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.activated.v1~',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  allOf: [{ $ref: 'gts://gts.hai3.screensets.ext.lifecycle_stage.v1~' }],
  properties: {
    description: {
      type: 'string',
      const: 'Triggered after extension mount',
    },
  },
};

/**
 * Deactivated Lifecycle Stage - After unmount
 */
export const lifecycleStageDeactivatedSchema: JSONSchema = {
  $id: 'gts://gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.deactivated.v1~',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  allOf: [{ $ref: 'gts://gts.hai3.screensets.ext.lifecycle_stage.v1~' }],
  properties: {
    description: {
      type: 'string',
      const: 'Triggered after extension unmount',
    },
  },
};

/**
 * Destroyed Lifecycle Stage - Before unregistration
 */
export const lifecycleStageDestroyedSchema: JSONSchema = {
  $id: 'gts://gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.destroyed.v1~',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  allOf: [{ $ref: 'gts://gts.hai3.screensets.ext.lifecycle_stage.v1~' }],
  properties: {
    description: {
      type: 'string',
      const: 'Triggered before extension unregistration',
    },
  },
};

/**
 * MF-Specific Type Schemas (2 types)
 */

/**
 * MF Manifest Schema
 * Module Federation configuration for loading MFE bundles
 */
export const mfManifestSchema: JSONSchema = {
  $id: 'gts://gts.hai3.screensets.mfe.mf.v1~',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    id: {
      'x-gts-ref': '/$id',
      $comment: 'The GTS type ID for this instance',
    },
    remoteEntry: {
      type: 'string',
      format: 'uri',
      $comment: 'URL to the remoteEntry.js file',
    },
    remoteName: {
      type: 'string',
      minLength: 1,
      $comment: 'Module Federation container name',
    },
    sharedDependencies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', $comment: "Package name (e.g., 'react', 'lodash')" },
          requiredVersion: { type: 'string', $comment: "Semver range (e.g., '^18.0.0')" },
          singleton: {
            type: 'boolean',
            default: false,
            $comment: 'If true, share single instance. Default false = isolated instances.',
          },
        },
        required: ['name', 'requiredVersion'],
      },
      $comment: 'Dependencies to share for bundle optimization',
    },
    entries: {
      type: 'array',
      items: { 'x-gts-ref': 'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~*' },
      $comment: 'Convenience field for discovery - lists MfeEntryMF type IDs',
    },
  },
  required: ['id', 'remoteEntry', 'remoteName'],
};

/**
 * MFE Entry MF Schema (Derived)
 * Module Federation implementation extending the base MfeEntry
 */
export const mfeEntryMfSchema: JSONSchema = {
  $id: 'gts://gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  allOf: [{ $ref: 'gts://gts.hai3.screensets.mfe.entry.v1~' }],
  properties: {
    manifest: {
      'x-gts-ref': 'gts.hai3.screensets.mfe.mf.v1~*',
      $comment: 'Reference to MfManifest type ID containing Module Federation config',
    },
    exposedModule: {
      type: 'string',
      minLength: 1,
      $comment: "Module Federation exposed module name (e.g., './ChartWidget')",
    },
  },
  required: ['manifest', 'exposedModule'],
};

/**
 * Export all schemas as a single object for easy registration
 */
export const mfeGtsSchemas = {
  // Core types (8)
  mfeEntry: mfeEntrySchema,
  extensionDomain: extensionDomainSchema,
  extension: extensionSchema,
  sharedProperty: sharedPropertySchema,
  action: actionSchema,
  actionsChain: actionsChainSchema,
  lifecycleStage: lifecycleStageSchema,
  lifecycleHook: lifecycleHookSchema,
  // Default lifecycle stages (4)
  lifecycleStageInit: lifecycleStageInitSchema,
  lifecycleStageActivated: lifecycleStageActivatedSchema,
  lifecycleStageDeactivated: lifecycleStageDeactivatedSchema,
  lifecycleStageDestroyed: lifecycleStageDestroyedSchema,
  // MF-specific types (2)
  mfManifest: mfManifestSchema,
  mfeEntryMf: mfeEntryMfSchema,
} as const;
