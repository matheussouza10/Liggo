import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

/**
 * Password hashing with scrypt (built into Node, no native dependency).
 * Stored format: scrypt$N$r$p$<salt base64>$<hash base64>
 * The parameters are stored with the hash, so they can be raised later
 * without invalidating existing passwords.
 */

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEM = 128 * N * R * 2;

function derive(
  password: string,
  salt: Buffer,
  n: number,
  r: number,
  p: number,
  keyLength: number,
): Promise<Buffer> {
  const options: ScryptOptions = { N: n, r, p, maxmem: MAX_MEM };
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      keyLength,
      options,
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, N, R, P, KEY_LENGTH);
  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

// Hash of a random password, used to spend the same time when the e-mail
// does not exist, so a response time never reveals whether an account exists.
let dummyHash: Promise<string> | undefined;

/**
 * Returns true only when `password` matches `stored`. A missing, empty or
 * malformed `stored` value always returns false (after doing equivalent work).
 */
export async function verifyPassword(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  const parts = (stored ?? "").split("$");
  const wellFormed = parts.length === 6 && parts[0] === "scrypt";

  if (!wellFormed) {
    dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
    const dummy = (await dummyHash).split("$");
    await derive(
      password,
      Buffer.from(dummy[4], "base64"),
      N,
      R,
      P,
      KEY_LENGTH,
    );
    return false;
  }

  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, "base64");
  const actual = await derive(
    password,
    Buffer.from(salt, "base64"),
    Number(n),
    Number(r),
    Number(p),
    expected.length,
  );
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
