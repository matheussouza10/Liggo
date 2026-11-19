/** One password rule for sign up, reset, invitation and change. Client-safe. */
export const MIN_PASSWORD_LENGTH = 8;
// scrypt is deliberately slow; cap the input so a huge password cannot burn server time.
export const MAX_PASSWORD_LENGTH = 200;

/** A message in Portuguese when the password is not acceptable, or null. */
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH)
    return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (password.length > MAX_PASSWORD_LENGTH)
    return `Use no máximo ${MAX_PASSWORD_LENGTH} caracteres.`;
  return null;
}

export function confirmationProblem(
  password: string,
  confirm: string,
): string | null {
  if (!confirm) return "Repita a senha.";
  return confirm === password ? null : "As senhas não coincidem.";
}
