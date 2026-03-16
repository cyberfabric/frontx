// Type declarations for ESLint plugins without their own types

declare module 'eslint-plugin-react-hooks' {
  import type { Linter, ESLint } from 'eslint';

  const plugin: ESLint.Plugin & {
    configs: {
      recommended: {
        rules: Linter.RulesRecord;
      };
    };
  };

  export default plugin;
}

declare module 'eslint-plugin-unused-imports' {
  import type { ESLint } from 'eslint';

  const plugin: ESLint.Plugin;

  export default plugin;
}
