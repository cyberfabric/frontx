import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getProjectUtilsTemplate } from './project.js';

describe('getProjectUtilsTemplate', () => {
  it('uses shadcn utils template for shadcn projects', () => {
    assert.equal(getProjectUtilsTemplate('shadcn'), 'src/app/lib/utils.ts');
  });

  it('uses local cn utils template for none projects', () => {
    assert.equal(getProjectUtilsTemplate('none'), 'src/app/lib/utils.no-uikit.ts');
  });

  it('uses local cn utils template for third-party uikit projects', () => {
    assert.equal(getProjectUtilsTemplate('@acme/design-system'), 'src/app/lib/utils.no-uikit.ts');
  });
});
