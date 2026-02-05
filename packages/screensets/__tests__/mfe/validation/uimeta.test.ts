/**
 * Tests for Dynamic uiMeta Validation (Type ID Reference Pattern)
 *
 * Tests the new approach from Decision 9:
 * - Domain has optional extensionsUiMetaTypeId field (type ID reference)
 * - Extension has optional uiMeta field (instance data)
 * - Validate using standard plugin.validateInstance(typeId, instance)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validateExtensionUiMeta } from '../../../src/mfe/validation/uimeta';
import { createGtsPlugin } from '../../../src/mfe/plugins/gts';
import type { ExtensionDomain } from '../../../src/mfe/types/extension-domain';
import type { Extension } from '../../../src/mfe/types/extension';
import type { TypeSystemPlugin } from '../../../src/mfe/plugins/types';

describe('uiMeta Validation (Type ID Reference Pattern)', () => {
  let plugin: TypeSystemPlugin;

  beforeEach(() => {
    // Use a fresh GTS plugin instance for each test
    plugin = createGtsPlugin();
  });

  describe('6.3.1: Successful uiMeta validation when extensionsUiMetaTypeId is specified', () => {
    it('should validate valid uiMeta successfully', () => {
      // Define the uiMeta schema as a separate GTS type
      const widgetUiMetaSchema = {
        $id: 'gts://gts.acme.dashboard.ext.widget_ui_meta.v1~',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          title: { type: 'string' },
          width: { type: 'number' },
        },
        required: ['title'],
      };

      // Register the uiMeta schema as a separate type
      plugin.registerSchema(widgetUiMetaSchema);

      // Domain references the schema by type ID
      const domain: ExtensionDomain = {
        id: 'gts.hai3.screensets.ext.domain.v1~acme.dashboard.widget_slot.v1~',
        sharedProperties: [],
        actions: [],
        extensionsActions: [],
        extensionsUiMetaTypeId: 'gts.acme.dashboard.ext.widget_ui_meta.v1~',
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };

      // Extension with valid uiMeta
      const extension: Extension = {
        id: 'gts.hai3.screensets.ext.extension.v1~acme.widgets.chart.v1~',
        domain: domain.id,
        entry: 'gts.hai3.screensets.mfe.entry.v1~acme.entries.chart.v1~',
        uiMeta: {
          title: 'Sales Chart',
          width: 400,
        },
      };

      const result = validateExtensionUiMeta(plugin, domain, extension);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('6.3.2: uiMeta validation failure returns proper error with type ID', () => {
    it('should fail validation for invalid uiMeta', () => {
      // Define the uiMeta schema
      const widgetUiMetaSchema = {
        $id: 'gts://gts.acme.dashboard.ext.widget_ui_meta.v1~',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          title: { type: 'string' },
          width: { type: 'number' },
        },
        required: ['title'],
      };

      plugin.registerSchema(widgetUiMetaSchema);

      const domain: ExtensionDomain = {
        id: 'gts.hai3.screensets.ext.domain.v1~acme.dashboard.widget_slot.v1~',
        sharedProperties: [],
        actions: [],
        extensionsActions: [],
        extensionsUiMetaTypeId: 'gts.acme.dashboard.ext.widget_ui_meta.v1~',
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };

      // Extension with invalid uiMeta (missing required 'title')
      const extension: Extension = {
        id: 'gts.hai3.screensets.ext.extension.v1~acme.widgets.chart.v1~',
        domain: domain.id,
        entry: 'gts.hai3.screensets.mfe.entry.v1~acme.entries.chart.v1~',
        uiMeta: {
          width: 400,
          // missing 'title'
        },
      };

      const result = validateExtensionUiMeta(plugin, domain, extension);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.path.includes('uiMeta'))).toBe(true);
      expect(result.errors.some((e) => e.message.includes('gts.acme.dashboard.ext.widget_ui_meta.v1~'))).toBe(true);
    });
  });

  describe('6.3.3: Skip validation when extensionsUiMetaTypeId is not specified', () => {
    it('should skip validation when domain has no extensionsUiMetaTypeId', () => {
      const domain: ExtensionDomain = {
        id: 'gts.hai3.screensets.ext.domain.v1~acme.dashboard.widget_slot.v1~',
        sharedProperties: [],
        actions: [],
        extensionsActions: [],
        // No extensionsUiMetaTypeId - validation should be skipped
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };

      const extension: Extension = {
        id: 'gts.hai3.screensets.ext.extension.v1~acme.widgets.chart.v1~',
        domain: domain.id,
        entry: 'gts.hai3.screensets.mfe.entry.v1~acme.entries.chart.v1~',
        uiMeta: {
          // Any uiMeta data is fine when no validation is required
          arbitraryField: 'anything',
        },
      };

      const result = validateExtensionUiMeta(plugin, domain, extension);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip validation when extension has no uiMeta', () => {
      // Define and register schema
      const widgetUiMetaSchema = {
        $id: 'gts://gts.acme.dashboard.ext.widget_ui_meta.v1~',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          title: { type: 'string' },
        },
        required: ['title'],
      };

      plugin.registerSchema(widgetUiMetaSchema);

      const domain: ExtensionDomain = {
        id: 'gts.hai3.screensets.ext.domain.v1~acme.dashboard.widget_slot.v1~',
        sharedProperties: [],
        actions: [],
        extensionsActions: [],
        extensionsUiMetaTypeId: 'gts.acme.dashboard.ext.widget_ui_meta.v1~',
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };

      // Extension without uiMeta
      const extension: Extension = {
        id: 'gts.hai3.screensets.ext.extension.v1~acme.widgets.chart.v1~',
        domain: domain.id,
        entry: 'gts.hai3.screensets.mfe.entry.v1~acme.entries.chart.v1~',
        // No uiMeta field
      };

      const result = validateExtensionUiMeta(plugin, domain, extension);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('6.3.4: Error when referenced type ID is not registered', () => {
    it('should return error when type is not registered', () => {
      const domain: ExtensionDomain = {
        id: 'gts.hai3.screensets.ext.domain.v1~acme.dashboard.widget_slot.v1~',
        sharedProperties: [],
        actions: [],
        extensionsActions: [],
        extensionsUiMetaTypeId: 'gts.acme.dashboard.ext.widget_ui_meta.v1~', // Not registered
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };

      const extension: Extension = {
        id: 'gts.hai3.screensets.ext.extension.v1~acme.widgets.chart.v1~',
        domain: domain.id,
        entry: 'gts.hai3.screensets.mfe.entry.v1~acme.entries.chart.v1~',
        uiMeta: {
          title: 'Sales Chart',
        },
      };

      const result = validateExtensionUiMeta(plugin, domain, extension);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('may not be registered');
    });
  });

  describe('6.3.5: uiMeta validation with derived domains', () => {
    it('should validate uiMeta against derived domain schema', () => {
      // Base uiMeta schema
      const baseUiMetaSchema = {
        $id: 'gts://gts.hai3.screensets.ext.popup_ui_meta.v1~',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          modal: { type: 'boolean' },
        },
        required: ['modal'],
      };

      // Derived uiMeta schema with additional fields
      const derivedUiMetaSchema = {
        $id: 'gts://gts.acme.alerts.ext.alert_ui_meta.v1~',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        allOf: [
          { $ref: 'gts://gts.hai3.screensets.ext.popup_ui_meta.v1~' },
        ],
        properties: {
          severity: { type: 'string', enum: ['info', 'warning', 'error'] },
        },
        required: ['severity'],
      };

      plugin.registerSchema(baseUiMetaSchema);
      plugin.registerSchema(derivedUiMetaSchema);

      // Derived domain
      const derivedDomain: ExtensionDomain = {
        id: 'gts.hai3.screensets.ext.domain.v1~hai3.screensets.layout.popup.v1~acme.alerts.v1~',
        sharedProperties: [],
        actions: [],
        extensionsActions: [],
        extensionsUiMetaTypeId: 'gts.acme.alerts.ext.alert_ui_meta.v1~',
        defaultActionTimeout: 5000,
        lifecycleStages: [],
        extensionsLifecycleStages: [],
      };

      // Extension with both base and derived uiMeta fields
      const extension: Extension = {
        id: 'gts.hai3.screensets.ext.extension.v1~acme.alerts.critical.v1~',
        domain: derivedDomain.id,
        entry: 'gts.hai3.screensets.mfe.entry.v1~acme.entries.alert.v1~',
        uiMeta: {
          modal: true,
          severity: 'error',
        },
      };

      const result = validateExtensionUiMeta(plugin, derivedDomain, extension);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
