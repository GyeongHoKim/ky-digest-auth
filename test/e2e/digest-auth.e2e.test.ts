import crypto from 'node:crypto';
import ky, { HTTPError } from 'ky';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { digestAuth } from '../../src/index.ts';

/**
 * A mock device that behaves like the real probed target: it answers an
 * un-authenticated request with `401` and TWO challenges (Digest + Bearer),
 * and validates the Digest response the same way the device would.
 */
const BASE = 'https://device.example.test';
const USERNAME = 'admin';
const PASSWORD = 's3cret';
const REALM = 'WEB SERVER';
const NONCE = '55a4cbb36f5d855b95b6a701cfc2cfe9';
const OPAQUE = '5ccc069c403ebaf9f0171e9517f40e41';

function challenge(algorithm = 'MD5', qop = 'auth'): string {
  return `Digest realm="${REALM}",qop="${qop}",algorithm=${algorithm},nonce="${NONCE}",opaque="${OPAQUE}"`;
}

function unauthorized(wwwAuthenticate: string, withBearer = true): HttpResponse<null> {
  const headers = new Headers();
  headers.append('WWW-Authenticate', wwwAuthenticate);
  if (withBearer) headers.append('WWW-Authenticate', 'Bearer realm="auth"');
  return new HttpResponse(null, { status: 401, headers });
}

function parseAuthorization(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of header.matchAll(/(\w+)=(?:"([^"]*)"|([^,]*))/g)) {
    const key = match[1];
    if (key) out[key] = match[2] ?? match[3] ?? '';
  }
  return out;
}

function expectedResponse(fields: Record<string, string>, method: string, nodeAlg: string): string {
  const h = (s: string) => crypto.createHash(nodeAlg).update(s, 'utf8').digest('hex');
  const ha1 = h(`${USERNAME}:${REALM}:${PASSWORD}`);
  const ha2 = h(`${method}:${fields.uri}`);
  return h(`${ha1}:${NONCE}:${fields.nc}:${fields.cnonce}:auth:${ha2}`);
}

function digestHandler(method: string, nodeAlg = 'md5', algorithm = 'MD5') {
  return ({ request }: { request: Request }) => {
    const auth = request.headers.get('authorization');
    if (!auth?.startsWith('Digest ')) {
      return unauthorized(challenge(algorithm));
    }
    const fields = parseAuthorization(auth);
    const valid =
      fields.username === USERNAME &&
      fields.realm === REALM &&
      fields.nonce === NONCE &&
      fields.opaque === OPAQUE &&
      fields.response === expectedResponse(fields, method, nodeAlg);
    if (!valid) {
      return unauthorized(challenge(algorithm));
    }
    return HttpResponse.json({ ok: true, uri: fields.uri, nc: fields.nc });
  };
}

const server = setupServer(
  http.get(`${BASE}/api/status`, digestHandler('GET')),
  http.put(`${BASE}/api/config`, digestHandler('PUT')),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('digest auth (e2e)', () => {
  it('authenticates a GET transparently through the 401 challenge', async () => {
    const api = ky.create({
      prefix: BASE,
      hooks: digestAuth({ username: USERNAME, password: PASSWORD, cnonce: () => 'testcnonce' }),
    });

    const data = await api.get('api/status').json<{ ok: boolean; nc: string }>();
    expect(data.ok).toBe(true);
    expect(data.nc).toBe('00000001');
  });

  it('authenticates a PUT with a JSON body', async () => {
    const api = ky.create({
      prefix: BASE,
      hooks: digestAuth({ username: USERNAME, password: PASSWORD, cnonce: () => 'testcnonce' }),
    });

    const data = await api.put('api/config', { json: { enabled: true } }).json<{ ok: boolean }>();
    expect(data.ok).toBe(true);
  });

  it('throws an HTTPError on a wrong password without looping', async () => {
    const api = ky.create({
      prefix: BASE,
      hooks: digestAuth({ username: USERNAME, password: 'wrong', cnonce: () => 'testcnonce' }),
    });

    await expect(api.get('api/status')).rejects.toBeInstanceOf(HTTPError);
  });

  it('preemptively authenticates the second request and increments nc', async () => {
    const api = ky.create({
      prefix: BASE,
      hooks: digestAuth({
        username: USERNAME,
        password: PASSWORD,
        preemptive: true,
        cnonce: () => 'fixedcnonce',
      }),
    });

    const first = await api.get('api/status').json<{ nc: string }>();
    const second = await api.get('api/status').json<{ nc: string }>();
    expect(first.nc).toBe('00000001');
    expect(second.nc).toBe('00000002');
  });

  it('rejects an auth-int-only challenge with a clear error', async () => {
    server.use(http.get(`${BASE}/api/status`, () => unauthorized(challenge('MD5', 'auth-int'))));
    const api = ky.create({
      prefix: BASE,
      hooks: digestAuth({ username: USERNAME, password: PASSWORD }),
    });

    await expect(api.get('api/status')).rejects.toThrow(/auth-int/);
  });

  it('rejects an algorithm outside the allowed list', async () => {
    const api = ky.create({
      prefix: BASE,
      hooks: digestAuth({ username: USERNAME, password: PASSWORD, algorithms: ['SHA-256'] }),
    });

    await expect(api.get('api/status')).rejects.toThrow(/not in the allowed list/);
  });

  it('works with a SHA-256 device', async () => {
    server.use(http.get(`${BASE}/api/status`, digestHandler('GET', 'sha256', 'SHA-256')));
    const api = ky.create({
      prefix: BASE,
      hooks: digestAuth({ username: USERNAME, password: PASSWORD, cnonce: () => 'testcnonce' }),
    });

    const data = await api.get('api/status').json<{ ok: boolean }>();
    expect(data.ok).toBe(true);
  });
});
