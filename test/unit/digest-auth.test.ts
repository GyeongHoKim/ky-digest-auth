import { describe, expect, it } from 'vitest';
import { digestAuth } from '../../src/index.ts';

describe('digestAuth', () => {
  it('returns beforeRequest and afterResponse hooks by default', () => {
    const hooks = digestAuth({ username: 'admin', password: 'pw' });
    expect(Array.isArray(hooks.beforeRequest)).toBe(true);
    expect(Array.isArray(hooks.afterResponse)).toBe(true);
  });

  it('adds the preemptive beforeRequest hook after the credentials hook', () => {
    const hooks = digestAuth({ username: 'admin', password: 'pw', preemptive: true });
    expect(hooks.beforeRequest).toHaveLength(2);
    expect(Array.isArray(hooks.afterResponse)).toBe(true);
  });

  it('sends every request with credentials "omit"', async () => {
    const hooks = digestAuth({ username: 'admin', password: 'pw' });
    const hook = hooks.beforeRequest?.[0];
    if (!hook) throw new Error('expected a beforeRequest hook');

    const result = await hook({
      request: new Request('https://device.example.test/', { credentials: 'include' }),
      options: {} as never,
      retryCount: 0,
    });

    expect(result).toBeInstanceOf(Request);
    expect((result as Request).credentials).toBe('omit');
  });

  it('preserves referrer and referrerPolicy when copying the request', async () => {
    const hooks = digestAuth({ username: 'admin', password: 'pw' });
    const hook = hooks.beforeRequest?.[0];
    if (!hook) throw new Error('expected a beforeRequest hook');

    const result = await hook({
      request: new Request('https://device.example.test/', {
        referrer: 'https://device.example.test/page',
        referrerPolicy: 'no-referrer',
      }),
      options: {} as never,
      retryCount: 0,
    });

    expect((result as Request).referrer).toBe('https://device.example.test/page');
    expect((result as Request).referrerPolicy).toBe('no-referrer');
  });

  it('throws without a username', () => {
    expect(() => digestAuth({ username: '', password: 'pw' })).toThrow(/username/);
  });

  it('allows an empty password (valid for Digest)', () => {
    expect(() => digestAuth({ username: 'admin', password: '' })).not.toThrow();
  });
});
