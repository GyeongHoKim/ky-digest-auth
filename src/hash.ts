import { md5 } from '@noble/hashes/legacy.js';
import { sha256, sha512_256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import type { DigestAlgorithm } from './types.ts';

const BASE_HASHES = {
  MD5: md5,
  'SHA-256': sha256,
  'SHA-512-256': sha512_256,
} as const;

type BaseName = keyof typeof BASE_HASHES;

/** All Digest algorithms this package understands. */
export const SUPPORTED_ALGORITHMS: readonly DigestAlgorithm[] = [
  'MD5',
  'MD5-sess',
  'SHA-256',
  'SHA-256-sess',
  'SHA-512-256',
  'SHA-512-256-sess',
];

/** Type guard: is `value` a Digest algorithm this package can compute? */
export function isSupportedAlgorithm(value: string): value is DigestAlgorithm {
  return (SUPPORTED_ALGORITHMS as readonly string[]).includes(value);
}

/** Strip the `-sess` suffix to get the underlying hash primitive name. */
function baseAlgorithm(algorithm: DigestAlgorithm): BaseName {
  return algorithm.replace(/-sess$/, '') as BaseName;
}

/** Hash a UTF-8 string with the primitive behind `algorithm`, returning lowercase hex. */
export function hashHex(algorithm: DigestAlgorithm, input: string): string {
  const hash = BASE_HASHES[baseAlgorithm(algorithm)];
  return bytesToHex(hash(utf8ToBytes(input)));
}
