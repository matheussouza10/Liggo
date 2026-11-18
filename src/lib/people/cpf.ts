/** CPF helpers. The CPF is stored as 11 digits and shown masked in lists. */

export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, "");
}

/** Checks length, repeated digits (000.000.000-00...) and both check digits. */
export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function formatCpf(value: string): string {
  const cpf = normalizeCpf(value);
  return cpf.length === 11
    ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    : value;
}

/** "•••.456.789-••": enough to recognize, not enough to copy. */
export function maskCpf(value: string | null | undefined): string {
  if (!value) return "Sem CPF";
  const cpf = normalizeCpf(value);
  return cpf.length === 11
    ? `•••.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-••`
    : "•••";
}
