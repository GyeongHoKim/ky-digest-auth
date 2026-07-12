import { describe, expect, it } from 'vitest';
import { digestAuth } from '../../src/index.ts';

describe('digestAuth', () => {
  it('is a function', () => {
    expect(typeof digestAuth).toBe('function');
  });

  // The implementation does not exist yet; this documents the intended surface.
  it.todo('returns beforeRequest and afterResponse hooks');
  it.todo('parses a WWW-Authenticate: Digest challenge');
  it.todo('computes the MD5 authorization response');
  it.todo('computes the SHA-256 authorization response');
});
