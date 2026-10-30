# VINHDAT DNS

Starter for Mac Intel + Docker. Includes static website, minimal Node API, AdGuard Home DNS resolver and Apple mobileconfig generator. **Local DNS on port 5353 is not DNS-over-HTTPS.** Production DoH requires a real public TLS endpoint.

## Start

```bash
cp .env.example .env
# Edit .env: set ADMIN_TOKEN to a random secret (>=24 characters)
docker compose up -d --build
```

- Website: http://localhost:8080
- API: http://localhost:3001/health
- AdGuard Home initial setup: http://localhost:3000

On first AdGuard setup, bind the DNS listener to `0.0.0.0:53` **inside the container**; set the web management listener to `0.0.0.0:80` for subsequent access at http://localhost:3080. The host ports are bound to 127.0.0.1 for safety.

```bash
dig @127.0.0.1 -p 5353 example.org
curl http://localhost:3001/health
```

### Create profile metadata (admin only)

```bash
curl -X POST http://localhost:3001/api/profiles \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"VINHDAT iPhone"}'
```

The response includes an `id`. After setting a **real** DoH URL in `.env` and restarting API:

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  'http://localhost:3001/api/profile.mobileconfig?id=YOUR_ID' \
  -o VINHDAT.mobileconfig
```

Do not publish ADMIN_TOKEN or any user information. This prototype is not a production-ready public administration system.

See [docs/DEPLOY.md](docs/DEPLOY.md) for the public DoH checklist.
