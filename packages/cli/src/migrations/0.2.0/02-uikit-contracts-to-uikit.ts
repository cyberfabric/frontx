// @cpt-algo:cpt-frontx-algo-cli-tooling-apply-migration:p2
/**
 * Transform: uikit-contracts-to-react
 *
 * Transforms @cyberfabric/uikit-contracts imports to @cyberfabric/react
 *
 * Before: import { ButtonVariant } from '@cyberfabric/uikit-contracts';
 * After:  import { ButtonVariant } from '@cyberfabric/react';
 */

import type { SourceFile } from 'ts-morph';
import type { Transform, TransformChange, TransformResult } from '../types.js';

const SOURCE_MODULE = '@cyberfabric/uikit-contracts';
const TARGET_MODULE = '@cyberfabric/react';

// @cpt-begin:cpt-frontx-algo-cli-tooling-apply-migration:p2:inst-apply-transforms
export const uikitContractsToUikitTransform: Transform = {
  id: 'uikit-contracts-to-react',
  name: 'Update @cyberfabric/uikit-contracts to @cyberfabric/react',
  description: `Transforms ${SOURCE_MODULE} imports to ${TARGET_MODULE}`,

  canApply(sourceFile: SourceFile): boolean {
    const fileText = sourceFile.getFullText();
    return fileText.includes(SOURCE_MODULE);
  },

  preview(sourceFile: SourceFile): TransformChange[] {
    const changes: TransformChange[] = [];

    // Check import declarations
    const importDeclarations = sourceFile.getImportDeclarations();
    for (const importDecl of importDeclarations) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      if (moduleSpecifier === SOURCE_MODULE) {
        const line = importDecl.getStartLineNumber();
        changes.push({
          line,
          before: importDecl.getText(),
          after: importDecl.getText().replace(SOURCE_MODULE, TARGET_MODULE),
          description: `Update import from ${SOURCE_MODULE} to ${TARGET_MODULE}`,
        });
      }
    }

    // Check export declarations (re-exports)
    const exportDeclarations = sourceFile.getExportDeclarations();
    for (const exportDecl of exportDeclarations) {
      const moduleSpecifier = exportDecl.getModuleSpecifierValue();
      if (moduleSpecifier === SOURCE_MODULE) {
        const line = exportDecl.getStartLineNumber();
        changes.push({
          line,
          before: exportDecl.getText(),
          after: exportDecl.getText().replace(SOURCE_MODULE, TARGET_MODULE),
          description: `Update re-export from ${SOURCE_MODULE} to ${TARGET_MODULE}`,
        });
      }
    }

    return changes;
  },

  apply(sourceFile: SourceFile): TransformResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    let changesApplied = 0;

    try {
      // Update import declarations
      const importDeclarations = sourceFile.getImportDeclarations();
      for (const importDecl of importDeclarations) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        if (moduleSpecifier === SOURCE_MODULE) {
          importDecl.setModuleSpecifier(TARGET_MODULE);
          changesApplied++;
        }
      }

      // Update export declarations (re-exports)
      const exportDeclarations = sourceFile.getExportDeclarations();
      for (const exportDecl of exportDeclarations) {
        const moduleSpecifier = exportDecl.getModuleSpecifierValue();
        if (moduleSpecifier === SOURCE_MODULE) {
          exportDecl.setModuleSpecifier(TARGET_MODULE);
          changesApplied++;
        }
      }

      return {
        success: true,
        changesApplied,
        warnings,
        errors,
      };
    } catch (error) {
      errors.push(`Failed to apply transform: ${String(error)}`);
      return {
        success: false,
        changesApplied,
        warnings,
        errors,
      };
    }
  },
};
// @cpt-end:cpt-frontx-algo-cli-tooling-apply-migration:p2:inst-apply-transforms
