import { bytesToHex } from '@noble/hashes/utils.js';

/**
 * Default client nonce generator: 16 cryptographically secure random bytes,
 * hex-encoded. Uses the Web Crypto `crypto.getRandomValues` global.
 */
export function defaultCnonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}
