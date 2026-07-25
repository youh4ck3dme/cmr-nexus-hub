import { createHmac, timingSafeEqual } from "crypto";

/** Hex HMAC-SHA256 of body with secret. */
export function hmacSha256Hex(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Constant-time compare of hex signatures.
 * Returns false if lengths differ or either is empty.
 */
export function verifyHmacSha256Hex(
  secret: string,
  body: string,
  signature: string,
): boolean {
  if (!secret || !signature) return false;
  const expected = hmacSha256Hex(secret, body);
  const sig = Buffer.from(signature);
  const exp = Buffer.from(expected);
  if (sig.length !== exp.length) return false;
  return timingSafeEqual(sig, exp);
}
