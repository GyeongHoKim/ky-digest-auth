# Digest Auth Diagnostics (Playground)

A self-contained diagnostic page that runs HTTP Digest Authentication from the
browser against your own device (CCTV, NVR, etc.) and, when it fails, tells you
exactly **which server-side response headers to add and how**. It effectively
replaces a CORS FAQ.

## Running it

```sh
# 1) From the repo root, build the library (produces dist/index.mjs)
npm install
npm run build

# 2) Serve the repo root with a static server
#    (ES modules + import maps do not work over file://)
npx serve .
# or: python -m http.server

# 3) Open it in a browser
#    http://localhost:3000/examples/playground/index.html
```

> Dependencies (`ky`, `@noble/hashes`) are loaded from [esm.sh](https://esm.sh),
> so the page needs an internet connection. The library itself is loaded from
> your local `dist/`.

## What it diagnoses

| Symptom | Diagnostic message | Server fix it points to |
| --- | --- | --- |
| Server unreachable / untrusted cert / CORS origin rejected | "Could not reach the server" | `Access-Control-Allow-Origin` etc. + trust the self-signed cert |
| 401 arrives but the challenge can't be read | "Could not read the WWW-Authenticate header" | `Access-Control-Expose-Headers: WWW-Authenticate` |
| Still 401 after authenticating | "credentials or Authorization header" | `Access-Control-Allow-Headers: Authorization` (+ check credentials) |
| Only `qop="auth-int"` offered | warning | (unsupported — rare on target devices) |
| All good | "Digest authentication succeeded 🎉" | — |

On success it also shows the `realm` / `algorithm` / `qop` the server requested.

## Notes

- Your password is used only inside the browser; it is never sent or stored
  anywhere else.
- If the device uses a self-signed HTTPS certificate, open the URL directly in
  your browser once to trust the certificate, otherwise `fetch` will fail.
- If the device provides no CORS headers at all, call it through a same-origin
  backend or reverse proxy instead (see the CORS section in the top-level
  `README.md`).
