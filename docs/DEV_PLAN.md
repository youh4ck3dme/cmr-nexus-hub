# CMR Nexus Hub – Development Plan

Stav k `2026-07-25`.

## Aktuálny stav

| Oblast | Stav | Poznámka |
| --- | --- | --- |
| Supabase schema + RLS | ✅ | `supabase/migrations/` |
| Auth gate | ✅ | email confirm môže blokovať signup E2E |
| Hydrate/seed z DB | ✅ | `store.tsx` + follow-ups seed |
| CRM / import / messages | ✅ | FK-safe import/convert |
| Settings ENV presence | ✅ | `getEnvStatus` server-fn |
| Settings DB truth | ✅ | live / error badge |
| Dashboard metriky + follow-ups | ✅ | local “dnes”, panel, mark done |
| GitHub sync kód | ✅ | `GITHUB_TOKEN` \| `GITHUB_API_KEY` + connector update |
| GitHub sync live E2E | ✅ lokálne | direct `api.github.com` s `GITHUB_TOKEN`; Lovable gateway voliteľne s `LOVABLE_API_KEY` |
| Base44 webhook HMAC | ✅ | `webhook-crypto` + DB map insert |
| Base44 live E2E | ⏸ | treba `BASE44_WEBHOOK_SECRET` + service role |
| Playwright | ✅ | `tests/unit-webhook.spec.ts` + `tests/smoke.spec.ts` |

---

## Tasky

| # | Task | Status |
| --- | --- | --- |
| 0 | E2E smoke + persistence | ✅ kód; auth confirm blokuje plný UI E2E |
| 1 | Settings DB + server ENV | ✅ |
| 2 | Follow-ups seed + dashboard | ✅ |
| 3 | GitHub sync E2E | ✅ kód / ⏸ secrets |
| 4 | Base44 webhook HMAC | ✅ kód / ⏸ secrets |
| 5 | Playwright smoke | ✅ |

---

## Príkazy

```bash
bun install
bun run dev          # :8080
bun run build
bun run typecheck
bun run test:unit    # helpers (HMAC, env, db-map)
bun run test:e2e     # browser + webhook HTTP smoke
bun run test         # všetko
```

### Secrets pre live connector/webhook

Do `.env` (nie `VITE_*`):

```
LOVABLE_API_KEY=
GITHUB_API_KEY=        # alebo GITHUB_TOKEN=
VERCEL_TOKEN=
BASE44_WEBHOOK_SECRET=
IMESSAGE_INTAKE_TOKEN=
SUPABASE_SERVICE_ROLE_KEY=
```

### Manuálny GitHub sync

1. Doplň `LOVABLE_API_KEY` + `GITHUB_API_KEY` (Lovable connector).
2. Prihlás sa → `/repos` → **Sync now**.
3. Očakávaj: reálne repá, connector `connected`, log v `/logs`.

### Manuálny Base44 webhook

```bash
BODY='{"owner_id":"<USER_UUID>","raw":"DAILY LEAD REPORT 100\nDate: 2026-07-25\n\nLEAD 1: Test Co\nWebsite: test.co\nScore: 90/100\nScore Label: KEEP\nEmail: a@test.co\n"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$BASE44_WEBHOOK_SECRET" | awk '{print $2}')
curl -sS -X POST "http://localhost:8080/api/public/hooks/base44" \
  -H "content-type: application/json" \
  -H "x-base44-signature: $SIG" \
  -d "$BODY"
```

---

## Ďalej (voliteľné)

- Vypnúť email confirm na Supabase pre dev (plný UI E2E)
- Cron / automations (pôvodná Fáza E)
- React Query server layer (`.lovable/plan.md` Fáza B) — nie blocker
