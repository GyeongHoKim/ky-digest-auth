import crypto from 'node:crypto';
import type { ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { CANARY_USERNAME, DIGEST_PASSWORD, DIGEST_PREFIX, DIGEST_USERNAME } from './fixtures.ts';

const NONCE = 'dcd98b7102dd2f0e8b11d0f600bfb0c093';
const OPAQUE = '5ccc069c403ebaf9f0171e9517f40e41';

function md5(input: string): string {
  return crypto.createHash('md5').update(input, 'utf8').digest('hex');
}

/**
 * Extract quoted and unquoted Digest parameters from the test requests'
 * Authorization header so the server can log usernames and verify responses.
 */
function parseAuthorization(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of header.matchAll(/(\w+)=(?:"([^"]*)"|([^,]*))/g)) {
    const key = match[1];
    if (key) out[key] = match[2] ?? match[3] ?? '';
  }
  return out;
}

/**
 * Check the fixture username, realm, and nonce, then verify the MD5 qop=auth
 * response using the request method and the client's Digest parameters.
 */
function isValid(fields: Record<string, string>, realm: string, method: string): boolean {
  if (fields.username !== DIGEST_USERNAME || fields.realm !== realm || fields.nonce !== NONCE) {
    return false;
  }
  const ha1 = md5(`${DIGEST_USERNAME}:${realm}:${DIGEST_PASSWORD}`);
  const ha2 = md5(`${method}:${fields.uri}`);
  return fields.response === md5(`${ha1}:${NONCE}:${fields.nc}:${fields.cnonce}:auth:${ha2}`);
}

function sendJson(res: ServerResponse, body: unknown): void {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

/**
 * A Digest-protected endpoint served from the Vitest browser server, so it is
 * same-origin with the test page. Every request's `username` is logged per
 * realm; the canary user is always rejected.
 */
export function digestServer(): Plugin {
  const logs = new Map<string, Array<string | null>>();

  return {
    name: 'test-digest-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (!url.pathname.startsWith(DIGEST_PREFIX)) return next();

        const [realm, action] = url.pathname.slice(DIGEST_PREFIX.length).split('/');
        if (!realm || (action !== 'protected' && action !== 'log')) return next();

        const log = logs.get(realm) ?? [];
        logs.set(realm, log);
        if (action === 'log') return sendJson(res, log);

        const authorization = req.headers.authorization;
        const fields = authorization?.startsWith('Digest ')
          ? parseAuthorization(authorization)
          : {};
        log.push(fields.username ?? null);

        if (fields.username !== CANARY_USERNAME && isValid(fields, realm, req.method ?? 'GET')) {
          return sendJson(res, { ok: true, nc: fields.nc });
        }
        res.statusCode = 401;
        res.setHeader(
          'WWW-Authenticate',
          `Digest realm="${realm}", qop="auth", algorithm=MD5, nonce="${NONCE}", opaque="${OPAQUE}"`,
        );
        res.end();
      });
    },
  };
}
