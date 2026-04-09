// @cpt-algo:cpt-frontx-algo-cli-tooling-apply-migration:p2
/**
 * Transform: module-augmentation
 *
 * Transforms module augmentation declarations from @cyberfabric/uicore to @cyberfabric/react
 *
 * Before: declare module '@cyberfabric/uicore' { interface RootState {...} }
 * After:  declare module '@cyberfabric/react' { interface RootState {...} }
 */

import { SyntaxKind } from 'ts-morph';
import type { SourceFile } from 'ts-morph';
import type { Transform, TransformChange, TransformResult } from '../types.js';

const SOURCE_MODULE = '@cyberfabric/uicore';
const TARGET_MODULE = '@cyberfabric/react';

// @cpt-begin:cpt-frontx-algo-cli-tooling-apply-migration:p2:inst-apply-transforms
export const moduleAugmentationTransform: Transform = {
  id: 'module-augmentation',
  name: 'Update module augmentation targets',
  description: `Transforms declare module '${SOURCE_MODULE}' to declare module '${TARGET_MODULE}'`,

  canApply(sourceFile: SourceFile): boolean {
    const fileText = sourceFile.getFullText();
    // Look for declare module '@cyberfabric/uicore' pattern
    return fileText.includes(`declare module '${SOURCE_MODULE}'`) ||
           fileText.includes(`declare module "${SOURCE_MODULE}"`);
  },

  preview(sourceFile: SourceFile): TransformChange[] {
    const changes: TransformChange[] = [];

    // Get all module declarations
    const moduleDeclarations = sourceFile.getDescendantsOfKind(
      SyntaxKind.ModuleDeclaration
    );

    for (const moduleDecl of moduleDeclarations) {
      // Check if this is an ambient module declaration (declare module "...")
      const name = moduleDecl.getName();
      // Module names include quotes, so check for both single and double quotes
      if (name === `'${SOURCE_MODULE}'` || name === `"${SOURCE_MODULE}"`) {
        const line = moduleDecl.getStartLineNumber();

        changes.push({
          line,
          before: `declare module '${SOURCE_MODULE}'`,
          after: `declare module '${TARGET_MODULE}'`,
          description: `Update module augmentation target from ${SOURCE_MODULE} to ${TARGET_MODULE}`,
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
      // Get all module declarations
      const moduleDeclarations = sourceFile.getDescendantsOfKind(
        SyntaxKind.ModuleDeclaration
      );

      for (const moduleDecl of moduleDeclarations) {
        const name = moduleDecl.getName();
        // Module names include quotes
        if (name === `'${SOURCE_MODULE}'` || name === `"${SOURCE_MODULE}"`) {
          // For module declarations, we need to use setName with quotes
          moduleDecl.setName(`'${TARGET_MODULE}'`);
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
