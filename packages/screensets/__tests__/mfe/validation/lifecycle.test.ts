/**
 * Tests for lifecycle validation
 */

import { describe, it, expect } from 'vitest';
import {
  validateDomainLifecycleHooks,
  validateExtensionLifecycleHooks,
} from '../../../src/mfe/validation/lifecycle';
import type { ExtensionDomain, Extension, LifecycleHook } from '../../../src/mfe/types';

describe('validateDomainLifecycleHooks', () => {
  it('should return valid for domain with no lifecycle hooks', () => {
    const domain: ExtensionDomain = {
      id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1',
      sharedProperties: [],
      actions: [],
      extensionsActions: [],
      defaultActionTimeout: 5000,
      lifecycleStages: [
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
      ],
      extensionsLifecycleStages: [
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.activated.v1',
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.deactivated.v1',
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
      ],
    };

    const result = validateDomainLifecycleHooks(domain);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return valid for domain with supported lifecycle hooks', () => {
    const initHook: LifecycleHook = {
      stage: 'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
      actions_chain: {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1',
        },
      },
    };

    const domain: ExtensionDomain = {
      id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1',
      sharedProperties: [],
      actions: [],
      extensionsActions: [],
      defaultActionTimeout: 5000,
      lifecycleStages: [
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
      ],
      extensionsLifecycleStages: [
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.activated.v1',
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.deactivated.v1',
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
      ],
      lifecycle: [initHook],
    };

    const result = validateDomainLifecycleHooks(domain);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return invalid for domain with unsupported lifecycle stage', () => {
    const unsupportedHook: LifecycleHook = {
      stage: 'gts.hai3.mfes.lifecycle.stage.v1~custom.stage.v1',
      actions_chain: {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1',
        },
      },
    };

    const domain: ExtensionDomain = {
      id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1',
      sharedProperties: [],
      actions: [],
      extensionsActions: [],
      defaultActionTimeout: 5000,
      lifecycleStages: [
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
      ],
      extensionsLifecycleStages: [
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.activated.v1',
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.deactivated.v1',
        'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
      ],
      lifecycle: [unsupportedHook],
    };

    const result = validateDomainLifecycleHooks(domain);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.stage).toBe('gts.hai3.mfes.lifecycle.stage.v1~custom.stage.v1');
    expect(result.errors[0]?.message).toContain('unsupported stage');
  });
});

describe('validateExtensionLifecycleHooks', () => {
  const domain: ExtensionDomain = {
    id: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1',
    sharedProperties: [],
    actions: [],
    extensionsActions: [],
    defaultActionTimeout: 5000,
    lifecycleStages: [
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
    ],
    extensionsLifecycleStages: [
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.activated.v1',
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.deactivated.v1',
      'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
    ],
  };

  it('should return valid for extension with no lifecycle hooks', () => {
    const extension: Extension = {
      id: 'gts.hai3.mfes.ext.extension.v1~test.ext.v1',
      domain: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1',
      entry: 'gts.hai3.mfes.mfe.entry.v1~test.entry.v1',
    };

    const result = validateExtensionLifecycleHooks(extension, domain);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return valid for extension with supported lifecycle hooks', () => {
    const initHook: LifecycleHook = {
      stage: 'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
      actions_chain: {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1',
        },
      },
    };

    const extension: Extension = {
      id: 'gts.hai3.mfes.ext.extension.v1~test.ext.v1',
      domain: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1',
      entry: 'gts.hai3.mfes.mfe.entry.v1~test.entry.v1',
      lifecycle: [initHook],
    };

    const result = validateExtensionLifecycleHooks(extension, domain);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return invalid for extension with unsupported lifecycle stage', () => {
    const unsupportedHook: LifecycleHook = {
      stage: 'gts.hai3.mfes.lifecycle.stage.v1~custom.stage.v1',
      actions_chain: {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1',
        },
      },
    };

    const extension: Extension = {
      id: 'gts.hai3.mfes.ext.extension.v1~test.ext.v1',
      domain: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1',
      entry: 'gts.hai3.mfes.mfe.entry.v1~test.entry.v1',
      lifecycle: [unsupportedHook],
    };

    const result = validateExtensionLifecycleHooks(extension, domain);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.stage).toBe('gts.hai3.mfes.lifecycle.stage.v1~custom.stage.v1');
    expect(result.errors[0]?.message).toContain('unsupported stage');
    expect(result.errors[0]?.message).toContain(domain.id);
  });

  it('should validate multiple hooks correctly', () => {
    const validHook: LifecycleHook = {
      stage: 'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
      actions_chain: {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1',
        },
      },
    };

    const invalidHook: LifecycleHook = {
      stage: 'gts.hai3.mfes.lifecycle.stage.v1~custom.stage.v1',
      actions_chain: {
        action: {
          type: 'gts.hai3.mfes.comm.action.v1~test.action.v1',
          target: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1',
        },
      },
    };

    const extension: Extension = {
      id: 'gts.hai3.mfes.ext.extension.v1~test.ext.v1',
      domain: 'gts.hai3.mfes.ext.domain.v1~test.domain.v1',
      entry: 'gts.hai3.mfes.mfe.entry.v1~test.entry.v1',
      lifecycle: [validHook, invalidHook],
    };

    const result = validateExtensionLifecycleHooks(extension, domain);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.stage).toBe('gts.hai3.mfes.lifecycle.stage.v1~custom.stage.v1');
  });
});
