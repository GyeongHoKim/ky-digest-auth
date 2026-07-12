import { hashHex } from './hash.ts';
import type { Challenge, DigestAlgorithm } from './types.ts';

export interface AuthorizationParams {
  algorithm: DigestAlgorithm;
  username: string;
  password: string;
  /** HTTP method, e.g. `GET`. */
  method: string;
  /** The digest-uri: request path plus query string. */
  uri: string;
  /** Client nonce. */
  cnonce: string;
  /** Nonce count as 8 lowercase hex digits, e.g. `00000001`. */
  nc: string;
  /** Whether to use the `qop=auth` computation (vs. legacy RFC 2069). */
  useQop: boolean;
}

type HeaderParam = [key: string, value: string, quoted: boolean];

/**
 * Compute an `Authorization: Digest` header value per RFC 7616 (`qop=auth`,
 * with `-sess` support) or RFC 2069 (no qop). `qop=auth-int` is not supported
 * and must be rejected by the caller before reaching here.
 */
export function computeAuthorization(challenge: Challenge, p: AuthorizationParams): string {
  const h = (input: string): string => hashHex(p.algorithm, input);

  const ha1Base = h(`${p.username}:${challenge.realm}:${p.password}`);
  const ha1 = p.algorithm.endsWith('-sess')
    ? h(`${ha1Base}:${challenge.nonce}:${p.cnonce}`)
    : ha1Base;
  const ha2 = h(`${p.method}:${p.uri}`);

  const headerParams: HeaderParam[] = [
    ['username', p.username, true],
    ['realm', challenge.realm, true],
    ['nonce', challenge.nonce, true],
    ['uri', p.uri, true],
  ];

  if (p.useQop) {
    const response = h(`${ha1}:${challenge.nonce}:${p.nc}:${p.cnonce}:auth:${ha2}`);
    headerParams.push(
      ['algorithm', p.algorithm, false],
      ['qop', 'auth', false],
      ['nc', p.nc, false],
      ['cnonce', p.cnonce, true],
      ['response', response, true],
    );
  } else {
    const response = h(`${ha1}:${challenge.nonce}:${ha2}`);
    headerParams.push(['response', response, true]);
  }

  if (challenge.opaque !== undefined) {
    headerParams.push(['opaque', challenge.opaque, true]);
  }

  const serialized = headerParams
    .map(([key, value, quoted]) => (quoted ? `${key}="${value}"` : `${key}=${value}`))
    .join(', ');

  return `Digest ${serialized}`;
}
