export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false;
  const hasNumberOrSymbol = /[0-9]|[^a-zA-Z0-9]/.test(password);
  return hasNumberOrSymbol;
}

