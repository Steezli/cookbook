import { isValidPassword, validatePassword } from '../password';

describe('validatePassword', () => {
  it('rejects passwords shorter than 8 characters', () => {
    const result = validatePassword('Ab1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Must be at least 8 characters');
  });

  it('rejects passwords without uppercase letters', () => {
    const result = validatePassword('abcdefg1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Must include an uppercase letter');
  });

  it('rejects passwords without a number or symbol', () => {
    const result = validatePassword('Abcdefgh');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Must include a number or symbol');
  });

  it('accepts valid password with number', () => {
    const result = validatePassword('Abcdefg1');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts valid password with symbol', () => {
    const result = validatePassword('Abcdefg!');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns multiple errors for very weak passwords', () => {
    const result = validatePassword('abc');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects all-lowercase with numbers (no uppercase)', () => {
    const result = validatePassword('password1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Must include an uppercase letter');
  });

  it('rejects all-uppercase with numbers (valid — has uppercase and number)', () => {
    const result = validatePassword('PASSWORD1');
    expect(result.valid).toBe(true);
  });

  it('accepts mixed case with symbol', () => {
    const result = validatePassword('MyP@sswd');
    expect(result.valid).toBe(true);
  });

  it('rejects empty string', () => {
    const result = validatePassword('');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });
});

describe('isValidPassword (backward compat)', () => {
  it('returns true for valid passwords', () => {
    expect(isValidPassword('Abcdefg1')).toBe(true);
  });

  it('returns false for invalid passwords', () => {
    expect(isValidPassword('abc')).toBe(false);
  });

  it('returns false for password missing uppercase', () => {
    expect(isValidPassword('password1')).toBe(false);
  });

  it('returns false for password missing number/symbol', () => {
    expect(isValidPassword('Abcdefgh')).toBe(false);
  });
});
