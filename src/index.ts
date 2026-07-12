import type { Hooks } from 'ky';

/**
 * Digest algorithms this package can compute.
 *
 * The `SHA-256` family is delegated to Web Crypto where available; `MD5` and
 * `SHA-512-256` are computed with `@noble/hashes`, since Web Crypto does not
 * implement them. See the README for details.
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
 * Create a Ky hooks configuration that handles HTTP Digest Authentication.
 *
 * Not implemented yet — this is a scaffolding placeholder.
 */
export function digestAuth(options: DigestAuthOptions): DigestAuthHooks {
  void options;
  throw new Error('@gyeonghokim/ky-digest-auth: not implemented yet');
}
