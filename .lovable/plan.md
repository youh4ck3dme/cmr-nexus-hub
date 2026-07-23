
# Fázy B–G – realistický plán dodania

Schéma DB + auth gate sú hotové (Fáza A). Fázy B–G predstavujú ~30 nových súborov, 3 externé API integrácie, verejné webhooky s HMAC, pg_cron a end-to-end verifikáciu. **Poctivo sa nedá dodať kvalitne v jednom ťahu bez regresií.** Navrhujem dodať v štyroch po sebe idúcich runoch, každý overený build-om a Playwrightom pred pokračovaním.

---

## Run 1 — Fáza B (fundament, blokuje všetko ostatné)

**Nové súbory:**
- `src/lib/queries.ts` — `queryOptions` factory pre všetky domény
- `src/lib/leads.functions.ts` — list/create/update/import + `ensureSeed`
- `src/lib/projects.functions.ts` — projects + repos + deployments + wordpress + clients (jeden súbor, menej boilerplate)
- `src/lib/messages.functions.ts` — messages + automations + logs + connectors

**Zmenené:**
- `src/lib/store.tsx` — zostane len UI stav (`theme`); dátové API sa presunie do Query hookov `useLeads()`, `useProjects()` atď., ktoré interne volajú `useSuspenseQuery`
- 11× `src/routes/*.tsx` — nahradiť `useStore().leads` za `useLeads()` atď.
- `src/start.ts` — pridať `attachSupabaseAuth` middleware

**Seed logika:** prvé volanie `listLeads` pre nového usera → serverfn skontroluje `count(*) where owner_id = auth.uid()`; ak 0, vloží `demoLeads` (a analogicky pre ostatné domény). Deterministické, idempotentné, beží raz.

**Overenie:** signup nový user → dashboard ukáže seed → refresh stránky → dáta pretrvávajú → `INSERT` cez UI → `SELECT` v DB potvrdí.

---

## Run 2 — Fázy C + D (konektory + webhooky)

**Konektory:**
- `standard_connectors--connect` pre `github`, `vercel`, `wordpress`
- `src/lib/sync.functions.ts` — `syncRepos()`, `syncDeployments()`, `syncWordPress()` cez konektor gateway
- UI buttony „Sync now" v `/repos`, `/deployments`, `/wordpress`

**Webhooky (verejné, HMAC verified):**
- `src/routes/api/public/hooks/base44.ts` — prijme report, parsuje, insert do `lead_reports` + `leads`
- `src/routes/api/public/hooks/imessage.ts` — Apple Shortcut, `Bearer` token auth, insert do `message_intakes`
- `src/routes/api/public/hooks/vercel.ts` — deployment events → update `deployments`

**Secrets:** `BASE44_WEBHOOK_SECRET`, `IMESSAGE_INTAKE_TOKEN` cez `generate_secret`.

---

## Run 3 — Fáza E (pg_cron automatizácie)

- Migrácia zapne `pg_cron` + `pg_net`
- `src/routes/api/public/cron/send-followups.ts` — pošle pending follow-ups
- `src/routes/api/public/cron/sync-repos.ts` — volá `syncRepos` pre všetkých users
- `src/routes/api/public/cron/sync-deployments.ts`
- `cron.schedule(...)` volajúce stable URL `project--…-dev.lovable.app/api/public/cron/…` s `apikey` headerom
- Toggle v `/automations` reálne enable/disable cron jobu cez admin RPC

---

## Run 4 — Fázy F + G (SEO + verifikácia)

**Fáza F:**
- Vlastný `head()` pre každú leaf route (`/dashboard`, `/crm`, `/projects`, `/repos`, `/deployments`, `/wordpress`, `/messages`, `/automations`, `/logs`, `/settings`, `/leads/import`) s unique `title` + `description` + `og:*` + `twitter:card`
- `security--run_security_scan` → oprava findings
- `mem://index.md` + `mem://features/auth`, `mem://features/connectors`

**Fáza G — Playwright:**
- signup → dashboard (seed viditeľný)
- `/leads/import` paste Base44 raw → save → objaví sa v `/crm` po reload
- toggle automation → `/logs` zapíše záznam
- screenshot desktop (1280) + mobile (420)

---

## Prečo takto a nie „všetko naraz"

Fáza B zmení každú route (11 súborov). Ak v tom istom ťahu pridám aj konektory (nové env vary, gateway URL, error handling) + webhooky (HMAC, Zod, verifikované insertly cez admin) + cron (pg_net, stable URL, apikey), pravdepodobnosť tichej regresie (nesprávna query key, chýbajúci invalidate, zle wired seed) je vysoká a debug bude bolestivý. Postupne = každý run má explicitný check.

**Odhad:** Run 1 ~15–20 min, Run 2 ~15 min, Run 3 ~10 min, Run 4 ~10 min.

**Otázka pre teba:** Spustiť Run 1 (Fáza B) hneď teraz?
