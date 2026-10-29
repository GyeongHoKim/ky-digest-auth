/**
 * Constants shared by the browser tests and the same-origin Digest test
 * server. Must stay free of Node-only imports: it is bundled into the page.
 */
export const DIGEST_USERNAME = 'admin';
export const DIGEST_PASSWORD = 's3cret';

/**
 * Canary credentials handed to Playwright as `httpCredentials`. The browser
 * only sends them when it takes its own HTTP auth path — the path that shows
 * the native login dialog to a real user.
 */
export const CANARY_USERNAME = '__browser_prompt__';
export const CANARY_PASSWORD = 'canary';

export const DIGEST_PREFIX = '/__digest/';
