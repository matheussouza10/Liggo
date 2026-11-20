import { isValidCpf, normalizeCpf } from "@/lib/people/cpf";

/** CPF (11 digits) or CNPJ (14 digits). Pure. */
export function normalizeDocument(value: string): string {
  return normalizeCpf(String(value ?? ""));
}

export function isValidCnpj(value: string): boolean {
  const cnpj = normalizeDocument(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digit = (length: number) => {
    const weights =
      length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((t, w, i) => t + w * Number(cnpj[i]), 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return digit(12) === Number(cnpj[12]) && digit(13) === Number(cnpj[13]);
}

export type DocumentKind = "CPF" | "CNPJ";

export function documentKind(value: string): DocumentKind | null {
  const d = normalizeDocument(value);
  if (d.length === 11 && isValidCpf(d)) return "CPF";
  if (d.length === 14 && isValidCnpj(d)) return "CNPJ";
  return null;
}

/** "•••.456.789-••" style mask for showing a holder without exposing the number. */
export function maskDocument(value: string): string {
  const d = normalizeDocument(value);
  if (d.length === 14) return `••.•••.${d.slice(5, 8)}/••••-••`;
  if (d.length === 11) return `•••.${d.slice(3, 6)}.${d.slice(6, 9)}-••`;
  return "••••";
}
