import { buildHooks } from './hooks.ts';
import type { DigestAuthHooks, DigestAuthOptions } from './types.ts';

export type { DigestAlgorithm, DigestAuthHooks, DigestAuthOptions } from './types.ts';

/**
 * Create a Ky hooks configuration that handles HTTP Digest Authentication.
 *
 * @example
 * ```ts
 * import ky from 'ky';
 * import {digestAuth} from '@gyeonghokim/ky-digest-auth';
 *
 * const api = ky.create({
 *   hooks: digestAuth({username: 'admin', password: 'password'}),
 * });
 * ```
 */
export function digestAuth(options: DigestAuthOptions): DigestAuthHooks {
  if (typeof options?.username !== 'string' || options.username.length === 0) {
    throw new Error('ky-digest-auth: "username" is required');
  }
  if (typeof options.password !== 'string') {
    throw new Error('ky-digest-auth: "password" is required');
  }
  return buildHooks(options);
}
