import type { AfterResponseHook, BeforeRequestHook } from 'ky';
import ky from 'ky';
import { parseChallenge } from './challenge.ts';
import { defaultCnonce } from './cnonce.ts';
import { computeAuthorization } from './digest.ts';
import { isSupportedAlgorithm } from './hash.ts';
import type { Challenge, DigestAlgorithm, DigestAuthHooks, DigestAuthOptions } from './types.ts';

/** Format a nonce count as 8 lowercase hex digits. */
function formatNc(count: number): string {
  return count.toString(16).padStart(8, '0');
}

/** Protection-space key for the preemptive challenge cache. */
function originKey(url: string): string {
  return new URL(url).origin;
}

/**
 * Build the Ky hooks that implement HTTP Digest Authentication. All mutable
 * state (nonce counters, cached challenges) lives in this closure, so each
 * `digestAuth()` call is independent.
 */
export function buildHooks(options: DigestAuthOptions): DigestAuthHooks {
  const { username, password, algorithms, preemptive } = options;
  const makeCnonce = options.cnonce ?? defaultCnonce;
  const nonceCounts = new Map<string, number>();
  const challengeCache = new Map<string, Challenge>();

  function nextNc(nonce: string): string {
    const count = (nonceCounts.get(nonce) ?? 0) + 1;
    nonceCounts.set(nonce, count);
    return formatNc(count);
  }

  function selectAlgorithm(challenge: Challenge): DigestAlgorithm {
    const raw = challenge.algorithm;
    if (!isSupportedAlgorithm(raw)) {
      throw new Error(`ky-digest-auth: unsupported Digest algorithm "${raw}"`);
    }
    if (algorithms && !algorithms.includes(raw)) {
      throw new Error(
        `ky-digest-auth: server requested algorithm "${raw}", which is not in the allowed list [${algorithms.join(', ')}]`,
      );
    }
    return raw;
  }

  function authorize(challenge: Challenge, request: Request): string {
    const algorithm = selectAlgorithm(challenge);

    const qop = challenge.qop;
    if (qop && qop.length > 0 && !qop.includes('auth')) {
      throw new Error('ky-digest-auth: server only offers qop="auth-int", which is not supported');
    }
    const useQop = qop !== undefined && qop.length > 0;

    const url = new URL(request.url);
    return computeAuthorization(challenge, {
      algorithm,
      username,
      password,
      method: request.method,
      uri: url.pathname + url.search,
      cnonce: makeCnonce(),
      nc: nextNc(challenge.nonce),
      useQop,
    });
  }

  const afterResponse: AfterResponseHook = ({ request, response, retryCount }) => {
    if (response.status !== 401) return;

    const challenge = parseChallenge(response.headers.get('www-authenticate'));
    if (!challenge) return;

    // Loop guard: only re-authenticate once, unless the server says the nonce
    // is stale. Bounded by `retry.limit` regardless.
    if (retryCount > 0 && !challenge.stale) return;

    const authorization = authorize(challenge, request);
    if (preemptive) challengeCache.set(originKey(request.url), challenge);

    const headers = new Headers(request.headers);
    headers.set('Authorization', authorization);
    return ky.retry({ request: new Request(request, { headers }), code: 'DIGEST_AUTH' });
  };

  if (!preemptive) {
    return { afterResponse: [afterResponse] };
  }

  const beforeRequest: BeforeRequestHook = ({ request }) => {
    if (request.headers.has('Authorization')) return;
    const cached = challengeCache.get(originKey(request.url));
    if (!cached) return;
    try {
      request.headers.set('Authorization', authorize(cached, request));
    } catch {
      // If preemptive auth cannot be computed, fall back to the challenge flow.
    }
  };

  return { beforeRequest: [beforeRequest], afterResponse: [afterResponse] };
}
