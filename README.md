# @gyeonghokim/ky-digest-auth

[![npm version](https://img.shields.io/npm/v/@gyeonghokim/ky-digest-auth?label=npm)](https://www.npmjs.com/package/@gyeonghokim/ky-digest-auth)
[![CI](https://github.com/GyeongHoKim/ky-digest-auth/actions/workflows/ci.yml/badge.svg)](https://github.com/GyeongHoKim/ky-digest-auth/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@gyeonghokim/ky-digest-auth)](./LICENSE)

HTTP Digest Authentication for [Ky](https://github.com/sindresorhus/ky).

## Install

```sh
npm install ky @gyeonghokim/ky-digest-auth
```

## Usage

```ts
import ky from 'ky';
import { digestAuth } from '@gyeonghokim/ky-digest-auth';

const api = ky.create({
  hooks: digestAuth({
    username: 'admin',
    password: 'password',
  }),
});

const data = await api.get('https://device.example.com/api/status').json();

console.log(data);
```

The plugin automatically:

1. Receives the `401 Unauthorized` response.
2. Parses the `WWW-Authenticate: Digest` challenge.
3. Calculates the Digest authorization response.
4. Retries the request with the generated `Authorization` header.

### Browser login dialog

When a page calls a Digest-protected API on its **own origin**, browsers
intercept the `401` and show their native login dialog, holding the request
until the user submits it. The response never reaches Ky's hooks.

To prevent this, the plugin sends every request with `credentials: 'omit'`.
This overrides any `credentials` option you pass, and it only turns off
browser-managed credentials: cookies are neither sent nor stored for these
requests, and cached HTTP auth and client certificates are not used. The
`Authorization` header computed by the plugin is still sent. Cross-origin
requests with Ky's default credentials behave exactly as before.

## API

### `digestAuth(options)`

Returns a Ky hooks configuration that handles HTTP Digest Authentication.

```ts
import ky from 'ky';
import { digestAuth } from '@gyeonghokim/ky-digest-auth';

const api = ky.create({
  hooks: digestAuth({
    username: 'admin',
    password: 'password',
  }),
});
```

### Options

#### `username`

Type: `string`

The username used for Digest Authentication.

#### `password`

Type: `string`

The password used for Digest Authentication.

#### `algorithms`

Type:

```ts
Array<'MD5' | 'MD5-sess' | 'SHA-256' | 'SHA-256-sess' | 'SHA-512-256' | 'SHA-512-256-sess'>;
```

Optional list of allowed Digest algorithms.

```ts
const api = ky.create({
  hooks: digestAuth({
    username: 'admin',
    password: 'password',
    algorithms: ['SHA-256', 'MD5'],
  }),
});
```

When omitted, all algorithms supported by this package are allowed.

Many embedded devices (CCTV, NVR, and similar systems) still issue `MD5`
challenges. Because the Web Crypto API does not implement `MD5` or
`SHA-512-256`, this package computes every Digest hash with
[`@noble/hashes`](https://github.com/paulmillr/noble-hashes), an audited,
zero-dependency, tree-shakeable hashing library. All listed algorithms work in
any supported runtime without extra configuration. See
[Supported environments](#supported-environments) for details.

#### `preemptive`

Type: `boolean`
Default: `false`

Reuses a previously received Digest challenge for later requests to the same protection space.

```ts
const api = ky.create({
  hooks: digestAuth({
    username: 'admin',
    password: 'password',
    preemptive: true,
  }),
});
```

The first request still requires a server challenge.

#### `cnonce`

Type: `() => string`

Overrides the client nonce generator.

```ts
const api = ky.create({
  hooks: digestAuth({
    username: 'admin',
    password: 'password',
    cnonce: () => 'custom-client-nonce',
  }),
});
```

This is mainly useful for deterministic tests. The default implementation uses a cryptographically secure random value.

## Examples

### Typed JSON response

```ts
import ky from 'ky';
import { digestAuth } from '@gyeonghokim/ky-digest-auth';

type DeviceStatus = {
  online: boolean;
  firmwareVersion: string;
};

const api = ky.create({
  hooks: digestAuth({
    username: 'admin',
    password: 'password',
  }),
});

const status = await api.get('https://device.example.com/api/status').json<DeviceStatus>();

console.log(status.firmwareVersion);
```

### Create a reusable client

```ts
const deviceApi = ky.create({
  baseUrl: 'https://device.example.com/api/',
  hooks: digestAuth({
    username: 'admin',
    password: 'password',
  }),
});

const status = await deviceApi.get('status').json();
const configuration = await deviceApi.get('configuration').json();
```

### Send JSON

```ts
await deviceApi.put('configuration', {
  json: {
    enabled: true,
    quality: 'high',
  },
});
```

### Extend an existing Ky instance

```ts
const baseApi = ky.create({
  timeout: 10_000,
  headers: {
    Accept: 'application/json',
  },
});

const deviceApi = baseApi.extend({
  hooks: digestAuth({
    username: 'admin',
    password: 'password',
  }),
});
```

### Combine with other hooks

Ky hook arrays must be merged when multiple integrations use the same lifecycle hook.

```ts
const digestHooks = digestAuth({
  username: 'admin',
  password: 'password',
});

const api = ky.create({
  hooks: {
    beforeRequest: [
      ({ request }) => {
        request.headers.set('X-Client-Version', '1.0.0');
      },
      ...(digestHooks.beforeRequest ?? []),
    ],
    afterResponse: [
      ({ response }) => {
        console.log(response.status);
      },
      ...(digestHooks.afterResponse ?? []),
    ],
  },
});
```

## Retry behavior

Digest Authentication requires at least one additional request after receiving the initial challenge.

The plugin uses Ky's `afterResponse` hook and forced retry mechanism to retry the request with the generated `Authorization` header.

Do not disable retries completely:

```ts
const api = ky.create({
  retry: {
    limit: 1,
  },
  hooks: digestAuth({
    username: 'admin',
    password: 'password',
  }),
});
```

The following configuration prevents Digest Authentication from completing:

```ts
const api = ky.create({
  retry: {
    limit: 0,
  },
  hooks: digestAuth({
    username: 'admin',
    password: 'password',
  }),
});
```

The plugin prevents an authentication challenge from causing an infinite retry loop.

## CORS

HTTP Digest Authentication does not bypass the browser's same-origin policy.

For a cross-origin request, the server must expose the `WWW-Authenticate` response header:

```http
Access-Control-Expose-Headers: WWW-Authenticate
```

It must also allow the `Authorization` request header:

```http
Access-Control-Allow-Headers: Authorization, Content-Type
```

A typical CORS response may include:

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Expose-Headers: WWW-Authenticate
```

Many embedded devices do not provide a complete CORS implementation. When the target server does not support the required CORS headers, use a same-origin backend or reverse proxy.

```text
Browser
   |
   | Application authentication
   v
Backend or reverse proxy
   |
   | Digest Authentication
   v
Device or legacy service
```

## Security

Do not embed shared service credentials in publicly distributed browser code.

Credentials used by browser JavaScript can be inspected by the current user. Browser-side Digest Authentication is appropriate when:

- the user provides their own credentials;
- the user is permitted to access those credentials; or
- the application runs in a controlled environment with an appropriate threat model.

Use a trusted backend for fixed or privileged service credentials.

Digest Authentication does not encrypt HTTP traffic. Use HTTPS whenever the target server supports it.

## Supported environments

The package requires a Fetch-compatible runtime with:

- `fetch`
- `Request`
- `Response`
- `Headers`
- `crypto.getRandomValues` (for the default client nonce)

Node.js `>= 26` is required when running outside the browser.

It is intended for modern browsers and other runtimes supported by Ky.

### Hashing

The Web Crypto API only exposes `SHA-1`, `SHA-256`, `SHA-384`, and `SHA-512`.
It does **not** provide `MD5` or `SHA-512-256`, both of which are common in the
Digest challenges issued by CCTV, NVR, and other embedded devices. (`SHA-512-256`
is a distinct algorithm from `SHA-512`, using different initial values rather
than a simple truncation, so a native `SHA-512` digest cannot be reused for it.)

Rather than relying on Web Crypto for hashing, the package computes every
algorithm through [`@noble/hashes`](https://github.com/paulmillr/noble-hashes):

| Algorithm                         | Module                    |
| --------------------------------- | ------------------------- |
| `MD5`, `MD5-sess`                 | `@noble/hashes/legacy.js` |
| `SHA-256`, `SHA-256-sess`         | `@noble/hashes/sha2.js`   |
| `SHA-512-256`, `SHA-512-256-sess` | `@noble/hashes/sha2.js`   |

`@noble/hashes` is an audited, zero-dependency, tree-shakeable library, so only
the algorithms you actually use are included in your bundle, and every listed
algorithm works in any Fetch-compatible runtime out of the box. It is installed
automatically as a dependency of this package.

## Supported authentication

This package handles HTTP Digest Authentication.

It does not provide:

- Basic Authentication
- Bearer tokens
- OAuth
- NTLM
- Negotiate or Kerberos
- form-based authentication
- cookie-based session management

## Development

```sh
npm install
npx playwright install chromium # once, for the browser tests
npm test
```

`npm test` runs the Node tests and the Chromium browser tests, including a
check that same-origin Digest requests never trigger the browser login
dialog.

## License

MIT
