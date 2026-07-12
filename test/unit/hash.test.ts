import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { hashHex } from '../../src/hash.ts';

// Cross-check @noble/hashes (via hashHex) against Node's OpenSSL-backed crypto,
// an independent implementation of the same primitives.
const ALGORITHMS = [
  ['MD5', 'md5'],
  ['SHA-256', 'sha256'],
  ['SHA-512-256', 'sha512-256'],
] as const;

const INPUTS = ['', 'abc', 'admin:WEB SERVER:s3cret', 'GET:/api/status', '한글:realm:pw'];

describe('hashHex', () => {
  for (const [algorithm, nodeName] of ALGORITHMS) {
    for (const input of INPUTS) {
      it(`${algorithm} matches OpenSSL for ${JSON.stringify(input)}`, () => {
        const expected = crypto.createHash(nodeName).update(input, 'utf8').digest('hex');
        expect(hashHex(algorithm, input)).toBe(expected);
      });
    }
  }

  it('-sess variants use the same base primitive', () => {
    expect(hashHex('MD5-sess', 'abc')).toBe(hashHex('MD5', 'abc'));
    expect(hashHex('SHA-256-sess', 'abc')).toBe(hashHex('SHA-256', 'abc'));
    expect(hashHex('SHA-512-256-sess', 'abc')).toBe(hashHex('SHA-512-256', 'abc'));
  });

  it('matches known empty-string vectors', () => {
    expect(hashHex('MD5', '')).toBe('d41d8cd98f00b204e9800998ecf8427e');
    expect(hashHex('SHA-256', '')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});
