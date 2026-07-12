import { describe, expect, it } from 'vitest';
import { parseChallenge } from '../../src/challenge.ts';

// The exact value returned by the real target device probe: two challenges
// (Digest + Bearer) comma-joined, as `Headers.get()` would surface them.
const REAL_DEVICE =
  'Digest realm="WEB SERVER",qop="auth",algorithm=MD5,nonce="55a4cbb36f5d855b95b6a701cfc2cfe9",opaque="5ccc069c403ebaf9f0171e9517f40e41", Bearer realm="auth"';

describe('parseChallenge', () => {
  it('parses a single Digest challenge', () => {
    const challenge = parseChallenge(
      'Digest realm="r", nonce="n", qop="auth", algorithm=SHA-256, opaque="o"',
    );
    expect(challenge).toMatchObject({
      scheme: 'Digest',
      realm: 'r',
      nonce: 'n',
      algorithm: 'SHA-256',
      opaque: 'o',
      qop: ['auth'],
    });
  });

  it('extracts Digest from a real Digest+Bearer response and ignores Bearer', () => {
    const challenge = parseChallenge(REAL_DEVICE);
    expect(challenge).toMatchObject({
      realm: 'WEB SERVER',
      nonce: '55a4cbb36f5d855b95b6a701cfc2cfe9',
      algorithm: 'MD5',
      opaque: '5ccc069c403ebaf9f0171e9517f40e41',
      qop: ['auth'],
    });
    // The Bearer challenge's realm must not leak in.
    expect(challenge?.realm).toBe('WEB SERVER');
  });

  it('splits a qop list', () => {
    expect(parseChallenge('Digest realm="r", nonce="n", qop="auth,auth-int"')?.qop).toEqual([
      'auth',
      'auth-int',
    ]);
  });

  it('defaults algorithm to MD5 and handles legacy no-qop', () => {
    const challenge = parseChallenge('Digest realm="r", nonce="n"');
    expect(challenge?.algorithm).toBe('MD5');
    expect(challenge?.qop).toBeUndefined();
  });

  it('handles a missing opaque', () => {
    expect(parseChallenge('Digest realm="r", nonce="n", qop="auth"')?.opaque).toBeUndefined();
  });

  it('preserves commas inside quoted values', () => {
    expect(parseChallenge('Digest realm="Server, Inc.", nonce="n"')?.realm).toBe('Server, Inc.');
  });

  it('parses stale', () => {
    expect(parseChallenge('Digest realm="r", nonce="n", stale=true')?.stale).toBe(true);
    expect(parseChallenge('Digest realm="r", nonce="n", stale=false')?.stale).toBe(false);
  });

  it('returns undefined for a Bearer-only challenge', () => {
    expect(parseChallenge('Bearer realm="auth"')).toBeUndefined();
  });

  it('returns undefined for empty input', () => {
    expect(parseChallenge('')).toBeUndefined();
    expect(parseChallenge(null)).toBeUndefined();
    expect(parseChallenge(undefined)).toBeUndefined();
  });
});
