import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventBus, resetStore } from '@cyberfabric/state';
import { createHAI3 } from '../src/createHAI3';
import { createHAI3App } from '../src/createHAI3App';
import { presets } from '../src/presets';
import { effects } from '../src/plugins/effects';
import { i18n } from '../src/plugins/i18n';
import { layout } from '../src/plugins/layout';
import { mock } from '../src/plugins/mock';
import { queryCache } from '../src/plugins/queryCache';
import { screensets } from '../src/plugins/screensets';
import { themes } from '../src/plugins/themes';
import { resetSharedQueryClient } from '../src/testing';
import type { HAI3Actions, HAI3App, HAI3Plugin } from '../src/types';

type ActionName = keyof HAI3Actions;

type ActionsView = Partial<HAI3Actions>;

function getActionsView(app: HAI3App): ActionsView {
  return app.actions as ActionsView;
}

function getStateSliceNames(app: HAI3App): string[] {
  return Object.keys(app.store.getState() as Record<string, unknown>);
}

function assertHasAction(actions: ActionsView, name: ActionName): void {
  expect(typeof actions[name]).toBe('function');
}

function assertMissingAction(actions: ActionsView, name: ActionName): void {
  // Runtime shape is a sparse map even though the TS interface is total; we
  // validate both absence of the key and the callable.
  expect(Object.hasOwn(actions, name)).toBe(false);
  expect(actions[name]).toBeUndefined();
}

describe('plugin system contract', () => {
  let apps: HAI3App[] = [];

  afterEach(() => {
    apps.forEach((app) => {
      app.destroy();
    });
    apps = [];
    vi.restoreAllMocks();
    eventBus.clearAll();
    resetStore();
    resetSharedQueryClient();
  });

  function track(app: HAI3App): HAI3App {
    apps.push(app);
    return app;
  }

  describe('preset surfaces', () => {
    it('headless preset keeps the unit-testable screensets-only surface', () => {
      const app = track(
        createHAI3()
          .use(presets.headless())
          .build()
      );
      const actions = getActionsView(app);
      const sliceNames = getStateSliceNames(app);

      expect(sliceNames).toContain('layout/screen');
      assertHasAction(actions, 'setActiveScreen');
      assertHasAction(actions, 'setScreenLoading');
      expect(app.themeRegistry).toBeUndefined();
      expect(app.i18nRegistry).toBeUndefined();
      assertMissingAction(actions, 'changeTheme');
      assertMissingAction(actions, 'showPopup');
      assertMissingAction(actions, 'toggleMockMode');
    });

    it('minimal preset exposes screensets plus themes only', () => {
      const app = track(
        createHAI3()
          .use(presets.minimal())
          .build()
      );
      const actions = getActionsView(app);

      expect(app.themeRegistry).toBeDefined();
      assertHasAction(actions, 'setActiveScreen');
      assertHasAction(actions, 'changeTheme');
      assertMissingAction(actions, 'showPopup');
      assertMissingAction(actions, 'setLanguage');
    });

    it('createHAI3App follows the full preset contract', () => {
      const app = track(createHAI3App());
      const actions = getActionsView(app);

      expect(app.themeRegistry).toBeDefined();
      expect(app.i18nRegistry).toBeDefined();
      assertHasAction(actions, 'changeTheme');
      assertHasAction(actions, 'setLanguage');
      assertHasAction(actions, 'showPopup');
      assertHasAction(actions, 'toggleMockMode');
      assertMissingAction(actions, 'loadExtension');
    });
  });

  describe('plugin factories', () => {
    it('expose stable names for supported composition pieces', () => {
      expect(screensets().name).toBe('screensets');
      expect(themes().name).toBe('themes');
      expect(layout().name).toBe('layout');
      expect(i18n().name).toBe('i18n');
      expect(effects().name).toBe('effects');
      expect(mock({ enabledByDefault: false }).name).toBe('mock');
      expect(queryCache().name).toBe('queryCache');
    });
  });

  describe('dependency resolution', () => {
    it('composition order does not matter when declared dependencies are present', () => {
      const app1 = track(
        createHAI3()
          .use(screensets())
          .use(themes())
          .use(layout())
          .build()
      );
      const app2 = track(
        createHAI3()
          .use(layout())
          .use(themes())
          .use(screensets())
          .build()
      );

      assertHasAction(getActionsView(app1), 'showPopup');
      assertHasAction(getActionsView(app2), 'showPopup');
      expect(app1.themeRegistry).toBeDefined();
      expect(app2.themeRegistry).toBeDefined();
    });

    it('succeeds when plugins are registered out of dependency order', () => {
      const app = track(
        createHAI3()
          .use(mock({ enabledByDefault: false }))
          .use(effects())
          .build()
      );

      assertHasAction(getActionsView(app), 'toggleMockMode');
    });
  });

  describe('negative paths', () => {
    it('strictMode throws when a plugin dependency is missing', () => {
      // layout declares a dependency on screensets; without it, strictMode
      // should fail loudly rather than silently degrade.
      expect(() => {
        createHAI3({ strictMode: true })
          .use(layout())
          .build();
      }).toThrowError(/requires "screensets"/);
    });

    it('non-strict mode warns and still builds when a dependency is missing', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const app = track(
          createHAI3()
            .use(layout())
            .build()
        );

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringMatching(/requires "screensets"/)
        );
        // Layout still registered its actions even though screensets was absent,
        // so the application remains navigable (if feature-limited).
        assertHasAction(getActionsView(app), 'showPopup');
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('detects circular dependencies between plugins', () => {
      const pluginA: HAI3Plugin = {
        name: 'test-cycle-a',
        dependencies: ['test-cycle-b'],
        provides: {},
      };
      const pluginB: HAI3Plugin = {
        name: 'test-cycle-b',
        dependencies: ['test-cycle-a'],
        provides: {},
      };

      expect(() => {
        createHAI3()
          .use(pluginA)
          .use(pluginB)
          .build();
      }).toThrowError(/Circular dependency/);
    });

    it('skips duplicate plugin registrations silently', () => {
      // Registering the same plugin factory twice should not throw and should
      // not double-register its actions.
      const app = track(
        createHAI3()
          .use(screensets())
          .use(screensets())
          .build()
      );

      const actions = getActionsView(app);
      assertHasAction(actions, 'setActiveScreen');
      // layout/screen slice should appear exactly once.
      const sliceNames = getStateSliceNames(app);
      const screenSliceCount = sliceNames.filter(
        (name) => name === 'layout/screen'
      ).length;
      expect(screenSliceCount).toBe(1);
    });

    it('emits a duplicate-registration warning in devMode', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const app = track(
          createHAI3({ devMode: true })
            .use(screensets())
            .use(screensets())
            .build()
        );

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringMatching(/already registered/)
        );
        expect(getStateSliceNames(app)).toContain('layout/screen');
      } finally {
        warnSpy.mockRestore();
      }
    });
  });
});
