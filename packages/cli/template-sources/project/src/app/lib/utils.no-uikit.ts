type ClassInput = string | false | null | undefined;

export function cn(...inputs: ClassInput[]) {
  return inputs.filter(Boolean).join(' ');
}
