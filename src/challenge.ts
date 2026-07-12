import type { Challenge } from './types.ts';

/**
 * A `WWW-Authenticate` value may carry several challenges. When accessed via
 * `Headers.get()`, multiple headers are also comma-joined into one string, e.g.
 *
 *   `Digest realm="WEB SERVER",qop="auth",...,opaque="...", Bearer realm="auth"`
 *
 * so parsing must be scheme-aware and extract only the `Digest` challenge.
 */
const AUTH_SCHEME = /^(Digest|Basic|Bearer|Negotiate|NTLM)(?:\s+(.*))?$/i;

/** Split on commas that are not inside a double-quoted string. */
function splitAuthParams(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (inQuotes && char === '\\' && i + 1 < input.length) {
      // Preserve escaped characters (e.g. \") verbatim; unescaped later.
      current += char + input[i + 1];
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts;
}

/** Strip surrounding double quotes and unescape a quoted-string value. */
function unquote(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\(.)/g, '$1');
  }
  return value;
}

/**
 * Parse a `WWW-Authenticate` header value and return the `Digest` challenge, or
 * `undefined` when no Digest challenge is present (e.g. a Bearer-only 401).
 */
export function parseChallenge(headerValue: string | null | undefined): Challenge | undefined {
  if (!headerValue) return undefined;

  const params: Record<string, string> = {};
  let currentScheme = '';
  let sawDigest = false;

  for (const segment of splitAuthParams(headerValue)) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    let paramPart = trimmed;
    const schemeMatch = AUTH_SCHEME.exec(trimmed);
    if (schemeMatch?.[1]) {
      currentScheme = schemeMatch[1].toLowerCase();
      if (currentScheme === 'digest') sawDigest = true;
      paramPart = (schemeMatch[2] ?? '').trim();
      if (!paramPart) continue; // bare scheme token with no inline parameter
    }

    if (currentScheme !== 'digest') continue;

    const eq = paramPart.indexOf('=');
    if (eq === -1) continue;
    const key = paramPart.slice(0, eq).trim().toLowerCase();
    params[key] = unquote(paramPart.slice(eq + 1).trim());
  }

  const realm = params.realm;
  const nonce = params.nonce;
  if (!sawDigest || realm === undefined || nonce === undefined) return undefined;

  const qopRaw = params.qop;
  const staleRaw = params.stale;

  return {
    scheme: 'Digest',
    realm,
    nonce,
    algorithm: params.algorithm ?? 'MD5',
    opaque: params.opaque,
    qop: qopRaw
      ? qopRaw
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : undefined,
    stale: staleRaw === undefined ? undefined : /^true$/i.test(staleRaw),
    domain: params.domain,
  };
}
