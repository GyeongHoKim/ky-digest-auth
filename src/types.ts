import type { Hooks } from 'ky';

/**
 * Digest algorithms this package can compute.
 *
 * The `SHA-256` family is computed with `@noble/hashes`; `MD5` and
 * `SHA-512-256` are also computed with `@noble/hashes`, since Web Crypto does
 * not implement them. See the README for details.
 */
export type DigestAlgorithm =
  | 'MD5'
  | 'MD5-sess'
  | 'SHA-256'
  | 'SHA-256-sess'
  | 'SHA-512-256'
  | 'SHA-512-256-sess';

export interface DigestAuthOptions {
  /** The username used for Digest Authentication. */
  username: string;
  /** The password used for Digest Authentication. */
  password: string;
  /** Optional list of allowed Digest algorithms. Defaults to all supported. */
  algorithms?: DigestAlgorithm[];
  /** Reuse a previously received challenge for the same protection space. */
  preemptive?: boolean;
  /** Override the client nonce generator. Mainly useful for deterministic tests. */
  cnonce?: () => string;
}

/** The subset of Ky hooks this plugin contributes. */
export type DigestAuthHooks = Pick<Hooks, 'beforeRequest' | 'afterResponse'>;

/**
 * A parsed `WWW-Authenticate: Digest` challenge.
 *
 * `algorithm` is kept as the raw string from the server (defaulting to `MD5`)
 * and validated against the supported set before it is used.
 */
export interface Challenge {
  scheme: 'Digest';
  realm: string;
  nonce: string;
  algorithm: string;
  opaque?: string;
  qop?: string[];
  stale?: boolean;
  domain?: string;
}
