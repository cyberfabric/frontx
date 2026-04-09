// @cpt-flow:cpt-frontx-flow-cli-tooling-validate-components:p1
/**
 * Validate command exports
 */

// @cpt-begin:cpt-frontx-flow-cli-tooling-validate-components:p1:inst-invoke-validate
export { validateComponentsCommand } from './components.js';
// @cpt-end:cpt-frontx-flow-cli-tooling-validate-components:p1:inst-invoke-validate
export type {
  ValidateComponentsArgs,
  ValidateComponentsResult,
  ComponentViolation,
} from './components.js';
