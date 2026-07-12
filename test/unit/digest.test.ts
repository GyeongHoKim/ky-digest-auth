import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { computeAuthorization } from '../../src/digest.ts';
import type { Challenge, DigestAlgorithm } from '../../src/types.ts';

function responseOf(header: string): string {
  const match = /response="([0-9a-f]+)"/.exec(header);
  if (!match?.[1]) throw new Error(`no response field in: ${header}`);
  return match[1];
}

// --- RFC 7616 §3.9.1 known-answer vectors (independently confirmed values) ---
const RFC_CHALLENGE: Challenge = {
  scheme: 'Digest',
  realm: 'http-auth@example.org',
  nonce: '7ypf/xlj9XXwfDPEoM4URrv/xwf94BcCAzFZH4GiTo0v',
  algorithm: 'SHA-256',
  opaque: 'FQhe/qaU925kfnzjCev0ciny7QMkPqMAFRtzCUYo5tdS',
  qop: ['auth'],
};
const RFC_PARAMS = {
  username: 'Mufasa',
  password: 'Circle of Life',
  method: 'GET',
  uri: '/dir/index.html',
  cnonce: 'f2/wE4q74E6zIJEtWaHKaf5wv/H5QzzpXusqGemxURZJ',
  nc: '00000001',
  useQop: true,
} as const;

describe('computeAuthorization — RFC 7616 vectors', () => {
  it('matches the SHA-256 vector', () => {
    const header = computeAuthorization(RFC_CHALLENGE, { ...RFC_PARAMS, algorithm: 'SHA-256' });
    expect(responseOf(header)).toBe(
      '753927fa0e85d155564e2e272a28d1802ca10daf4496794697cf8db5856cb6c1',
    );
  });

  it('matches the MD5 vector', () => {
    const header = computeAuthorization(
      { ...RFC_CHALLENGE, algorithm: 'MD5' },
      { ...RFC_PARAMS, algorithm: 'MD5' },
    );
    expect(responseOf(header)).toBe('8ca523f5e9506fed4657c9700eebdbec');
  });
});

// --- Cross-check the full formula against an independent Node-crypto reference ---
const NODE_NAME: Record<'MD5' | 'SHA-256' | 'SHA-512-256', string> = {
  MD5: 'md5',
  'SHA-256': 'sha256',
  'SHA-512-256': 'sha512-256',
};

function refResponse(o: {
  algorithm: DigestAlgorithm;
  username: string;
  password: string;
  realm: string;
  nonce: string;
  cnonce: string;
  nc: string;
  method: string;
  uri: string;
  useQop: boolean;
}): string {
  const base = o.algorithm.replace(/-sess$/, '') as keyof typeof NODE_NAME;
  const h = (s: string) => crypto.createHash(NODE_NAME[base]).update(s, 'utf8').digest('hex');
  let ha1 = h(`${o.username}:${o.realm}:${o.password}`);
  if (o.algorithm.endsWith('-sess')) ha1 = h(`${ha1}:${o.nonce}:${o.cnonce}`);
  const ha2 = h(`${o.method}:${o.uri}`);
  return o.useQop
    ? h(`${ha1}:${o.nonce}:${o.nc}:${o.cnonce}:auth:${ha2}`)
    : h(`${ha1}:${o.nonce}:${ha2}`);
}

const ALGORITHMS: DigestAlgorithm[] = [
  'MD5',
  'MD5-sess',
  'SHA-256',
  'SHA-256-sess',
  'SHA-512-256',
  'SHA-512-256-sess',
];

describe('computeAuthorization — reference cross-check', () => {
  const common = {
    username: 'admin',
    password: 's3cret',
    realm: 'WEB SERVER',
    nonce: 'abc123',
    cnonce: 'deadbeef',
    nc: '00000002',
    method: 'PUT',
    uri: '/api/config?x=1',
  };

  for (const algorithm of ALGORITHMS) {
    for (const useQop of [true, false]) {
      it(`${algorithm} ${useQop ? 'qop=auth' : 'legacy'}`, () => {
        const challenge: Challenge = {
          scheme: 'Digest',
          realm: common.realm,
          nonce: common.nonce,
          algorithm,
          opaque: 'op4que',
          qop: useQop ? ['auth'] : undefined,
        };
        const header = computeAuthorization(challenge, {
          algorithm,
          username: common.username,
          password: common.password,
          method: common.method,
          uri: common.uri,
          cnonce: common.cnonce,
          nc: common.nc,
          useQop,
        });
        expect(responseOf(header)).toBe(refResponse({ ...common, algorithm, useQop }));
      });
    }
  }

  it('serializes qop=auth fields and echoes opaque', () => {
    const header = computeAuthorization(
      { scheme: 'Digest', realm: 'r', nonce: 'n', algorithm: 'MD5', opaque: 'o', qop: ['auth'] },
      {
        algorithm: 'MD5',
        username: 'u',
        password: 'p',
        method: 'GET',
        uri: '/x',
        cnonce: 'c',
        nc: '00000001',
        useQop: true,
      },
    );
    expect(header).toContain('qop=auth');
    expect(header).toContain('nc=00000001');
    expect(header).toContain('cnonce="c"');
    expect(header).toContain('algorithm=MD5');
    expect(header).toContain('opaque="o"');
    expect(header).toMatch(/^Digest /);
  });

  it('omits qop, nc and cnonce in the legacy (RFC 2069) path', () => {
    const header = computeAuthorization(
      { scheme: 'Digest', realm: 'r', nonce: 'n', algorithm: 'MD5' },
      {
        algorithm: 'MD5',
        username: 'u',
        password: 'p',
        method: 'GET',
        uri: '/x',
        cnonce: 'c',
        nc: '00000001',
        useQop: false,
      },
    );
    expect(header).not.toContain('qop=');
    expect(header).not.toContain('nc=');
    expect(header).not.toContain('cnonce=');
  });
});
