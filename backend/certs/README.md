# certs

`supabase-prod-ca-2021.crt` is the **Supabase Root 2021 CA** (public certificate, safe to commit).

- Source: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt
- SHA-256 fingerprint: `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`
- **Expires: 2031-04-26.** Replace before then (re-download, update this fingerprint).
- Used by `src/db/client.ts` to verify the Supabase pooler's TLS certificate chain (TODO-046).
