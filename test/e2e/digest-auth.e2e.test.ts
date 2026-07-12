import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

/**
 * End-to-end tests drive Ky against a mocked device that issues a real
 * `401` + `WWW-Authenticate: Digest` challenge, then verify the retried
 * request carries a correct `Authorization: Digest` header.
 *
 * This file proves the MSW harness works; the digest assertions are `todo`
 * until the plugin is implemented.
 */
const server = setupServer(
  http.get('https://device.example.test/api/status', () => HttpResponse.json({ online: true })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('digest auth (e2e)', () => {
  it('MSW intercepts fetch to the mocked device', async () => {
    const response = await fetch('https://device.example.test/api/status');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ online: true });
  });

  it.todo('retries a 401 challenge with a Digest Authorization header');
  it.todo('increments nc when reusing a nonce in preemptive mode');
  it.todo('does not loop indefinitely when credentials are rejected');
});
