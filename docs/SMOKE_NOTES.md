# Task 0 — Smoke notes

Dátum: 2026-07-24  
Prostredie: lokálny `bun run dev` (port **8080**), Supabase project `ziexgodsbpupeqnpfrva`

## Čo prešlo

| Check | Stav | Poznámka |
| --- | --- | --- |
| `bun install` | ✅ | |
| Dev server štart | ✅ | `http://localhost:8080/` |
| `bun run typecheck` | ✅ | |
| `bun run build` | ✅ | |
| Supabase URL + publishable key v `.env` | ✅ | |
| Auth signup API | ✅ | User sa vytvorí |
| Parser lead report (príklad v UI) | ✅ | 1 lead, UUID ids, dátum `YYYY-MM-DD` |
| `normalizeDate("24/07/2026")` | ✅ | → `2026-07-24` |
| Zavádzajúce „in-memory mock“ texty | ✅ opravené | Settings + AppShell |

## Root cause fixes (kód)

1. **`src/lib/store.tsx`**
   - Seed/insert/update už **neignorujú** Supabase errors (surface `lastError`, banner v shelli).
   - Seed mapuje len DB stĺpce; **neplatné demo FK** (`client_id`, `project_id`, `lead_id`, `source_report_id`) → `null`.
   - Po seede sa vytvárajú **follow_ups** s reálnymi UUID leadov.
   - Nové `importReport(report, leads)` — **najprv report, potom leady** (FK `source_report_id`).
   - `asDbLead` / `asDbReport` + `normalizeDate` pre DATE stĺpce.
   - `dbReady` flag (live vs error) namiesto tichého prázdna.

2. **`src/routes/leads.import.tsx`**
   - Async import s error UI; zdieľané report UUID medzi reportom a leadmi.

3. **`src/routes/messages.tsx`**
   - Convert: **await addLead → potom** update message (FK `lead_id`).

4. **`src/lib/parsers.ts`**
   - Report dátum vždy `YYYY-MM-DD` (aj z `DD/MM/YYYY`).

5. **`src/routes/auth.tsx`**
   - Jasná hláška pri zapnutej email verifikácii / `email_not_confirmed`.

6. **`src/routes/settings.tsx` + `src/components/app-shell.tsx`**
   - Už netvrdia „in-memory demo / mock mode“ pre DB; ukazujú **Supabase · live** vs error + connectors mock.

## Blokér E2E (auth)

| Check | Stav | Poznámka |
| --- | --- | --- |
| Signup → okamžitý session | ❌ | Supabase vracia `confirmation_sent_at`, **bez `access_token`** |
| Login pred confirm | ❌ | `error_code: email_not_confirmed` |
| Dashboard seed po novom signup | ⏸ | Blokované confirm e-mailom |
| Import → CRM persist refresh | ⏸ | Vyžaduje authenticated session |
| Status change → refresh | ⏸ | Vyžaduje authenticated session |

**Príčina:** na Lovable Supabase projekte je zapnutá **email confirmation**. Bez `SUPABASE_SERVICE_ROLE_KEY` (v `.env` chýba; CLI `api-keys` → 403) nevieme usera admin-confirmnúť z agenta.

### Ako dokončiť manuálny E2E (2 min)

1. V Supabase Dashboard (alebo Lovable Cloud) buď:
   - **Auth → Providers → Email → vypni „Confirm email“** pre dev, **alebo**
   - potvrď overovací mail pre test účet.
2. `bun run dev` → `/auth` signup/login.
3. Over:
   - `/dashboard` ukáže seed leady/projekty
   - hard refresh → dáta ostanú
   - `/leads/import` → príklad → import → `/crm` ukáže Example Clinic
   - zmeň status → refresh → status ostane
   - `/settings` → Databáza badge **live**

## Tasks 1–5 (2026-07-25)

| Task | Stav |
| --- | --- |
| 1 Settings ENV + DB | ✅ `getEnvStatus` server-fn, Settings UI, badges |
| 2 Follow-ups + dashboard | ✅ seed follow-ups, metriky local-day, panel + mark done |
| 3 GitHub sync | ✅ kód (`GITHUB_TOKEN`\|`API_KEY`, connector update); live ⏸ secrets |
| 4 Base44 HMAC | ✅ `webhook-crypto` + DB map; live ⏸ secrets |
| 5 Playwright | ✅ 9 passed / 2 skipped (secrets) |

```bash
bun run test:unit   # 5 passed
bun run test:e2e    # browser + webhook
```

## Ostáva

- [ ] Manuálny E2E po potvrdení e-mailu (alebo vypnutí confirm)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` + `BASE44_WEBHOOK_SECRET` pre live webhook
- [x] `GITHUB_TOKEN` lokálne (direct API); `LOVABLE_API_KEY` len pre Lovable gateway (Cloud)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` pre live Base44/iMessage webhook insert

## Done criteria (Task 0)

- [x] Build OK  
- [x] Root cause persistence fixes v store/import/messages  
- [x] UI už neklaže o in-memory DB  
- [x] Smoke notes  
- [ ] Plný UI E2E s novým userom — **blokované email confirm** (pozri vyššie)
