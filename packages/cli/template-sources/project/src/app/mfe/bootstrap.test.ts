// @cpt-dod:cpt-frontx-dod-unit-test-generation-and-agent-verification-project-scaffold:p1
// Contract: bootstrap wiring matches manifests and module paths (see describeBootstrapMfeContract).
import { describeBootstrapMfeContract } from '@cyberfabric/react/testing';

describeBootstrapMfeContract({
  suiteName: 'bootstrapMFE (standalone template)',
  bootstrapModulePath: './bootstrap.ts',
  manifestsModulePath: './generated-mfe-manifests.ts',
  callerUrl: import.meta.url,
});
