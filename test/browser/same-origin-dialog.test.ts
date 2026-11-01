import ky from 'ky';
import { describe, expect, it } from 'vitest';
import { digestAuth } from '../../src/index.ts';
import { CANARY_USERNAME, DIGEST_PASSWORD, DIGEST_PREFIX, DIGEST_USERNAME } from './fixtures.ts';

let realmSeq = 0;

/** A fresh realm per test keeps the browser auth cache and logs isolated. */
function newRealm(): { protectedUrl: string; logUrl: string } {
  const base = new URL(`${DIGEST_PREFIX}realm-${Date.now()}-${realmSeq++}/`, location.origin);
  return { protectedUrl: new URL('protected', base).href, logUrl: new URL('log', base).href };
}

async function readLog(logUrl: string): Promise<Array<string | null>> {
  const response = await fetch(logUrl);
  return response.json();
}

describe('same-origin Digest in the browser', () => {
  it('control: a plain same-origin fetch takes the browser auth (dialog) path', async () => {
    const { protectedUrl, logUrl } = newRealm();

    const response = await fetch(protectedUrl);

    expect(response.status).toBe(401);
    expect(await readLog(logUrl)).toContain(CANARY_USERNAME);
  });

  it('digestAuth never lets the browser take the auth path, even with credentials "same-origin"', async () => {
    const { protectedUrl, logUrl } = newRealm();
    const api = ky.create({
      credentials: 'same-origin',
      hooks: digestAuth({ username: DIGEST_USERNAME, password: DIGEST_PASSWORD }),
    });

    const data = await api.get(protectedUrl).json<{ ok: boolean }>();

    expect(data.ok).toBe(true);
    expect(await readLog(logUrl)).toEqual([null, DIGEST_USERNAME]);
  });

  it('digestAuth in preemptive mode never lets the browser take the auth path', async () => {
    const { protectedUrl, logUrl } = newRealm();
    const api = ky.create({
      credentials: 'same-origin',
      hooks: digestAuth({ username: DIGEST_USERNAME, password: DIGEST_PASSWORD, preemptive: true }),
    });

    const first = await api.get(protectedUrl).json<{ ok: boolean; nc: string }>();
    const second = await api.get(protectedUrl).json<{ ok: boolean; nc: string }>();

    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: true, nc: '00000002' });
    expect(await readLog(logUrl)).toEqual([null, DIGEST_USERNAME, DIGEST_USERNAME]);
  });
});
