// @cpt-dod:cpt-frontx-dod-unit-test-generation-and-agent-verification-project-scaffold:p1
import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('joins truthy class names and ignores falsy values', () => {
    expect(cn('layout', false, undefined, 'screen')).toBe('layout screen');
  });
});
