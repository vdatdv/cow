# Public DoH deployment checklist

This starter is LOCAL ONLY. Do not install a profile on iOS until a real public DoH endpoint exists.

1. Deploy DNS to a public Linux host with a domain you control.
2. Configure AdGuard Home to serve RFC 8484 DNS-over-HTTPS, using a valid HTTPS certificate and an authenticated management panel.
3. For reverse proxy deployments, configure AdGuard Home's documented `http.doh.insecure_enabled` **only on an isolated internal network**; never expose plaintext DoH publicly.
4. Protect the DNS endpoint against abuse and rate-limit it; do not expose the admin interface.
5. Set `DOH_URL=https://your-domain.example/dns-query` on the API and restart.
6. Generate a profile with an authenticated API request and test on a noncritical iPhone.
7. Move backend to HTTPS and replace the starter token auth with accounts, roles and session management before public use.

Local Docker port 5353 provides ordinary DNS for testing only, NOT DoH.
