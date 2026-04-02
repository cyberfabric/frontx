// @cpt-dod:cpt-frontx-dod-unit-test-generation-and-agent-verification-standard-test-convention:p1
// The screensets package owns the MFE runtime (Shadow DOM mount helpers,
// bridge/host DOM-isolation tests, shadow-root CSS injection) and those tests
// exercise real DOM globals such as `document`, `HTMLElement`, and
// `ShadowRoot`. That is why this package opts into `environment: 'jsdom'`
// despite UNIT_TESTING.md's "ENVIRONMENT RULES" reminder that pure logic tests
// should avoid UI setup they do not need — these are not pure logic tests.
// Any new tests under this package that do not touch the DOM should still run
// under the same `jsdom` environment for consistency and fast-feedback; split
// to `environment: 'node'` via `vi.setConfig` only if a specific suite shows
// measurable overhead.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { definePackageVitestConfig } from '../../vitest.shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default definePackageVitestConfig({
  rootDir: __dirname,
  environment: 'jsdom',
});
