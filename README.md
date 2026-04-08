# bachelors-thesis

## Production deployment (COOP/COEP + Wasmer)

The IDE compiler path relies on `SharedArrayBuffer`, which requires a cross-origin isolated page.
Browsers enforce this only on trustworthy origins (HTTPS, or localhost).

This repository now includes a Caddy edge proxy that terminates TLS and forwards to the frontend container.

### 1. Configure DNS

Point an A/AAAA record for your domain to the deployment host.

### 2. Set environment variables

Set these variables in your shell (or in a `.env` file next to `docker-compose.yml`):

- `DOMAIN` (example: `ide.example.com`)
- `ACME_EMAIL` (email used for Let's Encrypt registration)

### 3. Start the stack

```bash
docker compose --profile all up -d --build
```

### 4. Open the app

Use `https://<DOMAIN>`.

Do not use plain HTTP for remote origins, otherwise COOP/COEP is ignored and Wasmer fails with the cross-origin isolation assertion.

### Notes

- The frontend container is bound to `127.0.0.1:8080` for local-only direct access.
- Public traffic should go through Caddy on ports `80/443`.
