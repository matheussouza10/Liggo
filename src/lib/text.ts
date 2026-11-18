/**
 * Canonical form of a name for duplicate checks: no accents, no case, single
 * spaces. Done in the app because the database's case-insensitive matching
 * (ILIKE, lower) does not fold accented letters in every locale.
 */
export function foldName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function sameName(a: string, b: string): boolean {
  return foldName(a) === foldName(b);
}
