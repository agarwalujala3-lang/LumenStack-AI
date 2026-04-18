import crypto from "node:crypto";

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash: derived };
}

export function verifyPassword(password, salt, expectedHash) {
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");

  if (derived.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(derived, expected);
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}
