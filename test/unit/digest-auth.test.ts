import { describe, expect, it } from 'vitest';
import { digestAuth } from '../../src/index.ts';

describe('digestAuth', () => {
  it('returns an afterResponse hook and no beforeRequest by default', () => {
    const hooks = digestAuth({ username: 'admin', password: 'pw' });
    expect(Array.isArray(hooks.afterResponse)).toBe(true);
    expect(hooks.beforeRequest).toBeUndefined();
  });

  it('adds a beforeRequest hook in preemptive mode', () => {
    const hooks = digestAuth({ username: 'admin', password: 'pw', preemptive: true });
    expect(Array.isArray(hooks.beforeRequest)).toBe(true);
    expect(Array.isArray(hooks.afterResponse)).toBe(true);
  });

  it('throws without a username', () => {
    expect(() => digestAuth({ username: '', password: 'pw' })).toThrow(/username/);
  });

  it('allows an empty password (valid for Digest)', () => {
    expect(() => digestAuth({ username: 'admin', password: '' })).not.toThrow();
  });
});
