import { createHash, randomBytes } from "node:crypto";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function newId(): string {
  return crockfordBase32(Date.now(), 10) + crockfordBase32FromBytes(randomBytes(10), 16);
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
