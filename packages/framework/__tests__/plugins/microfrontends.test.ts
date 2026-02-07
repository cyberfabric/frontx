/**
 * Tests for microfrontends plugin - Phase 7.9
 *
 * Tests plugin propagation and JSON loading ONLY.
 * Flux integration tests (actions, effects, slice) are in Phase 13.8.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from 'vitest';
import { createHAI3 } from '../../src/createHAI3';
import { screensets } from '../../src/plugins/screensets';
import {
  microfrontends,
  createSidebarDomain,
  createPopupDomain,
  createScreenDomain,
  createOverlayDomain,
} from '../../src/plugins/microfrontends';
import type { ScreensetsRegistry } from '@hai3/screensets';

describe('microfrontends plugin - Phase 7.9', () => {
  describe('plugin factory', () => {
    it('should accept no parameters', () => {
      expect(() => {
        microfrontends();
      }).not.toThrow();
    });

    it('should throw error if any configuration is passed', () => {
      expect(() => {
        // Testing runtime error when config is passed
        // We need to bypass TypeScript checking to test runtime behavior
        const pluginFactory = microfrontends as unknown as (config: Record<string, unknown>) => unknown;
        pluginFactory({ anything: true });
      }).toThrow(/accepts NO configuration parameters/);
    });

    it('should return a valid plugin object', () => {
      const plugin = microfrontends();

      expect(plugin).toHaveProperty('name', 'microfrontends');
      expect(plugin).toHaveProperty('dependencies');
      expect(plugin.dependencies).toContain('screensets');
      expect(plugin).toHaveProperty('onInit');
      expect(plugin).toHaveProperty('provides');
      expect(plugin.provides).toHaveProperty('registries');
    });
  });

  describe('7.9.1 - plugin obtains screensetsRegistry from framework', () => {
    it('should provide screensetsRegistry via provides.registries', () => {
      const plugin = microfrontends();

      expect(plugin.provides).toBeDefined();
      expect(plugin.provides?.registries).toBeDefined();
      expect(plugin.provides?.registries?.screensetsRegistry).toBeDefined();
    });

    it('should make screensetsRegistry available on app object', () => {
      const app = createHAI3()
        .use(screensets())
        .use(microfrontends())
        .build();

      expect(app.screensetsRegistry).toBeDefined();
      expect(typeof app.screensetsRegistry).toBe('object');
    });

    it('should expose screensetsRegistry with MFE methods', () => {
      const app = createHAI3()
        .use(screensets())
        .use(microfrontends())
        .build();

      const registry = app.screensetsRegistry as ScreensetsRegistry;

      // Verify MFE methods are present
      expect(typeof registry.registerDomain).toBe('function');
      expect(typeof registry.typeSystem).toBe('object');
      expect(registry.typeSystem.name).toBe('gts');
    });
  });

  describe('7.9.2 - same TypeSystemPlugin instance is propagated through layers', () => {
    it('should use same TypeSystemPlugin instance throughout', () => {
      const app = createHAI3()
        .use(screensets())
        .use(microfrontends())
        .build();

      const registry = app.screensetsRegistry as ScreensetsRegistry;

      // Verify the plugin is the GTS plugin
      expect(registry.typeSystem).toBeDefined();
      expect(registry.typeSystem.name).toBe('gts');
      expect(registry.typeSystem.version).toBe('1.0.0');

      // Verify plugin has required methods
      expect(typeof registry.typeSystem.isValidTypeId).toBe('function');
      expect(typeof registry.typeSystem.registerSchema).toBe('function');
      expect(typeof registry.typeSystem.getSchema).toBe('function');
      expect(typeof registry.typeSystem.register).toBe('function');
      expect(typeof registry.typeSystem.validateInstance).toBe('function');
    });

    it('should have consistent plugin reference across multiple calls', () => {
      const app = createHAI3()
        .use(screensets())
        .use(microfrontends())
        .build();

      const registry = app.screensetsRegistry as ScreensetsRegistry;

      // Get reference to plugin
      const plugin1 = registry.typeSystem;
      const plugin2 = registry.typeSystem;

      // Should be the same instance
      expect(plugin1).toBe(plugin2);
    });
  });

  describe('7.9.3 - runtime.registerDomain() works for base domains at runtime', () => {
    it('should register sidebar domain successfully', () => {
      const app = createHAI3()
        .use(screensets())
        .use(microfrontends())
        .build();

      const registry = app.screensetsRegistry as ScreensetsRegistry;
      const sidebarDomain = createSidebarDomain();

      expect(() => {
        registry.registerDomain(sidebarDomain);
      }).not.toThrow();
    });

    it('should register popup domain successfully', () => {
      const app = createHAI3()
        .use(screensets())
        .use(microfrontends())
        .build();

      const registry = app.screensetsRegistry as ScreensetsRegistry;
      const popupDomain = createPopupDomain();

      expect(() => {
        registry.registerDomain(popupDomain);
      }).not.toThrow();
    });

    it('should register screen domain successfully', () => {
      const app = createHAI3()
        .use(screensets())
        .use(microfrontends())
        .build();

      const registry = app.screensetsRegistry as ScreensetsRegistry;
      const screenDomain = createScreenDomain();

      expect(() => {
        registry.registerDomain(screenDomain);
      }).not.toThrow();
    });

    it('should register overlay domain successfully', () => {
      const app = createHAI3()
        .use(screensets())
        .use(microfrontends())
        .build();

      const registry = app.screensetsRegistry as ScreensetsRegistry;
      const overlayDomain = createOverlayDomain();

      expect(() => {
        registry.registerDomain(overlayDomain);
      }).not.toThrow();
    });

    it('should register all base domains without conflicts', () => {
      const app = createHAI3()
        .use(screensets())
        .use(microfrontends())
        .build();

      const registry = app.screensetsRegistry as ScreensetsRegistry;

      expect(() => {
        registry.registerDomain(createSidebarDomain());
        registry.registerDomain(createPopupDomain());
        registry.registerDomain(createScreenDomain());
        registry.registerDomain(createOverlayDomain());
      }).not.toThrow();
    });
  });

  describe('7.9.4 - JSON schema loading works correctly', () => {
    it('should load first-class citizen schemas during plugin construction', () => {
      const app = createHAI3()
        .use(screensets())
        .use(microfrontends())
        .build();

      const registry = app.screensetsRegistry as ScreensetsRegistry;

      // First-class citizen schemas should be available
      const coreSchemas = [
        'gts.hai3.mfes.mfe.entry.v1~',
        'gts.hai3.mfes.ext.domain.v1~',
        'gts.hai3.mfes.ext.extension.v1~',
        'gts.hai3.mfes.comm.shared_property.v1~',
        'gts.hai3.mfes.comm.action.v1~',
        'gts.hai3.mfes.comm.actions_chain.v1~',
        'gts.hai3.mfes.lifecycle.stage.v1~',
        'gts.hai3.mfes.lifecycle.hook.v1~',
      ];

      for (const schemaId of coreSchemas) {
        const schema = registry.typeSystem.getSchema(schemaId);
        expect(schema).toBeDefined();
        expect(schema).toHaveProperty('$id');
      }
    });

    it('should validate schema availability via getSchema', () => {
      const app = createHAI3()
        .use(screensets())
        .use(microfrontends())
        .build();

      const registry = app.screensetsRegistry as ScreensetsRegistry;

      // Test a few specific schemas
      const entrySchema = registry.typeSystem.getSchema('gts.hai3.mfes.mfe.entry.v1~');
      expect(entrySchema).toBeDefined();
      expect(entrySchema?.$id).toContain('gts.hai3.mfes.mfe.entry.v1~');

      const domainSchema = registry.typeSystem.getSchema('gts.hai3.mfes.ext.domain.v1~');
      expect(domainSchema).toBeDefined();
      expect(domainSchema?.$id).toContain('gts.hai3.mfes.ext.domain.v1~');
    });

    it('should return undefined for non-existent schemas', () => {
      const app = createHAI3()
        .use(screensets())
        .use(microfrontends())
        .build();

      const registry = app.screensetsRegistry as ScreensetsRegistry;

      const nonExistentSchema = registry.typeSystem.getSchema('gts.nonexistent.schema.v1~');
      expect(nonExistentSchema).toBeUndefined();
    });
  });

  describe('7.9.5 - JSON instance loading works correctly', () => {
    it('should load base domain instances from JSON', () => {
      const sidebarDomain = createSidebarDomain();
      const popupDomain = createPopupDomain();
      const screenDomain = createScreenDomain();
      const overlayDomain = createOverlayDomain();

      // Verify instances have correct structure
      expect(sidebarDomain.id).toContain('hai3.screensets.layout.sidebar');
      expect(popupDomain.id).toContain('hai3.screensets.layout.popup');
      expect(screenDomain.id).toContain('hai3.screensets.layout.screen');
      expect(overlayDomain.id).toContain('hai3.screensets.layout.overlay');
    });

    it('should validate loaded domain instances', () => {
      const app = createHAI3()
        .use(screensets())
        .use(microfrontends())
        .build();

      const registry = app.screensetsRegistry as ScreensetsRegistry;
      const sidebarDomain = createSidebarDomain();

      // Register the domain (this triggers validation internally)
      expect(() => {
        registry.registerDomain(sidebarDomain);
      }).not.toThrow();
    });

    it('should load lifecycle stages from JSON', () => {
      const sidebarDomain = createSidebarDomain();

      // Verify lifecycle stages are loaded
      expect(sidebarDomain.lifecycleStages).toBeDefined();
      expect(Array.isArray(sidebarDomain.lifecycleStages)).toBe(true);
      expect(sidebarDomain.lifecycleStages.length).toBe(4);

      // Verify stage IDs
      const stageIds = sidebarDomain.lifecycleStages;
      expect(stageIds).toContain('gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1');
      expect(stageIds).toContain('gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.activated.v1');
      expect(stageIds).toContain('gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.deactivated.v1');
      expect(stageIds).toContain('gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1');
    });

    it('should load base actions from JSON', () => {
      const sidebarDomain = createSidebarDomain();

      // Verify actions are loaded
      expect(sidebarDomain.actions).toBeDefined();
      expect(Array.isArray(sidebarDomain.actions)).toBe(true);
      expect(sidebarDomain.actions.length).toBe(2);

      // Verify action IDs
      expect(sidebarDomain.actions).toContain('gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.load_ext.v1');
      expect(sidebarDomain.actions).toContain('gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.unload_ext.v1');
    });

    it('should handle screen domain with only load_ext action', () => {
      const screenDomain = createScreenDomain();

      // Screen domain should only have load_ext, not unload_ext
      expect(screenDomain.actions.length).toBe(1);
      expect(screenDomain.actions).toContain('gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.load_ext.v1');
      expect(screenDomain.actions).not.toContain('gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.unload_ext.v1');
    });
  });

  describe('base domain factories', () => {
    it('should create sidebar domain with correct structure', () => {
      const domain = createSidebarDomain();

      expect(domain).toMatchObject({
        id: 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.sidebar.v1',
        sharedProperties: [],
        actions: [
          'gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.load_ext.v1',
          'gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.unload_ext.v1',
        ],
        extensionsActions: [],
        defaultActionTimeout: 5000,
      });
      expect(domain.lifecycleStages).toHaveLength(4);
      expect(domain.extensionsLifecycleStages).toHaveLength(4);
    });

    it('should create popup domain with correct structure', () => {
      const domain = createPopupDomain();

      expect(domain).toMatchObject({
        id: 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.popup.v1',
        sharedProperties: [],
        actions: [
          'gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.load_ext.v1',
          'gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.unload_ext.v1',
        ],
        extensionsActions: [],
        defaultActionTimeout: 5000,
      });
      expect(domain.lifecycleStages).toHaveLength(4);
      expect(domain.extensionsLifecycleStages).toHaveLength(4);
    });

    it('should create screen domain with only load_ext action', () => {
      const domain = createScreenDomain();

      expect(domain).toMatchObject({
        id: 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.screen.v1',
        sharedProperties: [],
        actions: [
          'gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.load_ext.v1',
        ],
        extensionsActions: [],
        defaultActionTimeout: 5000,
      });
      expect(domain.actions).toHaveLength(1);
      expect(domain.lifecycleStages).toHaveLength(4);
      expect(domain.extensionsLifecycleStages).toHaveLength(4);
    });

    it('should create overlay domain with correct structure', () => {
      const domain = createOverlayDomain();

      expect(domain).toMatchObject({
        id: 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.overlay.v1',
        sharedProperties: [],
        actions: [
          'gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.load_ext.v1',
          'gts.hai3.mfes.comm.action.v1~hai3.mfes.comm.unload_ext.v1',
        ],
        extensionsActions: [],
        defaultActionTimeout: 5000,
      });
      expect(domain.lifecycleStages).toHaveLength(4);
      expect(domain.extensionsLifecycleStages).toHaveLength(4);
    });
  });
});
