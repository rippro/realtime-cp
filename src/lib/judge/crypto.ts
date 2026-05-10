import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const parameters = { n: 4096, r: 8, p: 1, keyLength: 64 };
  const key = (await scryptAsync(password, salt, parameters.keyLength, {
    N: parameters.n,
    r: parameters.r,
    p: parameters.p,
  })) as Buffer;

  return `scrypt$N=${parameters.n},r=${parameters.r},p=${parameters.p}$${salt}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const parsed = parsePasswordHash(passwordHash);
  if (!parsed) {
    return false;
  }

  const key = (await scryptAsync(password, parsed.salt, parsed.hash.length, {
    N: parsed.n,
    r: parsed.r,
    p: parsed.p,
  })) as Buffer;

  return key.length === parsed.hash.length && timingSafeEqual(key, parsed.hash);
}

export function generateCliToken(): string {
  return `rj_live_${randomBytes(24).toString("base64url")}`;
}

export function generateInviteCode(): string {
  return randomBytes(18).toString("base64url");
}

export function newId(): string {
  return crockfordBase32(Date.now(), 10) + crockfordBase32FromBytes(randomBytes(10), 16);
}

function parsePasswordHash(passwordHash: string): {
  n: number;
  r: number;
  p: number;
  salt: string;
  hash: Buffer;
} | null {
  const [algorithm, parameterText, salt, hashText, extra] = passwordHash.split("$");
  if (algorithm !== "scrypt" || !parameterText || !salt || !hashText || extra !== undefined) {
    return null;
  }

  const parameters = new Map(
    parameterText.split(",").map((pair) => {
      const [key, value] = pair.split("=");
      return [key, Number(value)] as const;
    }),
  );
  const n = parameters.get("N");
  const r = parameters.get("r");
  const p = parameters.get("p");
  if (!n || !r || !p) {
    return null;
  }

  return {
    n,
    r,
    p,
    salt,
    hash: Buffer.from(hashText, "base64url"),
  };
}

function scryptAsync(
  password: string,
  salt: string,
  keyLength: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}

function crockfordBase32(value: number, length: number): string {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let remaining = value;
  let output = "";

  while (output.length < length) {
    output = alphabet[remaining % 32] + output;
    remaining = Math.floor(remaining / 32);
  }

  return output;
}

function crockfordBase32FromBytes(bytes: Buffer, length: number): string {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5 && output.length < length) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  while (output.length < length) {
    output += alphabet[0];
  }

  return output;
}
