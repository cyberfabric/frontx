import inquirer from 'inquirer';

/**
 * Prompt function type - abstracted for AI agent integration
 */
export type PromptFn = <T extends Record<string, unknown>>(
  questions: PromptQuestion[]
) => Promise<T>;

/**
 * Prompt question definition
 */
export interface PromptQuestion {
  name: string;
  type: 'input' | 'confirm' | 'list';
  message: string;
  default?: unknown;
  choices?: Array<{ name: string; value: unknown }>;
}

/**
 * Create interactive prompt function using Inquirer
 */
export function createInteractivePrompt(): PromptFn {
  return async <T extends Record<string, unknown>>(
    questions: PromptQuestion[]
  ): Promise<T> => {
    const inquirerQuestions = questions.map((q) => ({
      name: q.name,
      type: q.type,
      message: q.message,
      default: q.default,
      choices: q.choices,
    }));
    return inquirer.prompt(inquirerQuestions) as Promise<T>;
  };
}

/**
 * Create non-interactive prompt function that uses pre-filled answers
 */
export function createProgrammaticPrompt(
  answers: Record<string, unknown>
): PromptFn {
  return async <T extends Record<string, unknown>>(
    questions: PromptQuestion[]
  ): Promise<T> => {
    const result: Record<string, unknown> = {};
    for (const question of questions) {
      if (question.name in answers) {
        result[question.name] = answers[question.name];
      } else if (question.default !== undefined) {
        result[question.name] = question.default;
      } else {
        throw new Error(
          `Missing answer for required prompt: ${question.name}`
        );
      }
    }
    return result as T;
  };
}
