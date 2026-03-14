/**
 * Password validation rules:
 *  - At least 8 characters
 *  - At least one uppercase letter
 *  - At least one number or symbol
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

const MIN_LENGTH = 8;

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < MIN_LENGTH) {
    errors.push(`Must be at least ${MIN_LENGTH} characters`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Must include an uppercase letter");
  }

  if (!/[0-9]|[^a-zA-Z0-9]/.test(password)) {
    errors.push("Must include a number or symbol");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Simple boolean check for backward compatibility.
 */
export function isValidPassword(password: string): boolean {
  return validatePassword(password).valid;
}
