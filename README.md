# CMR Nexus Hub (CMR Central)

Interný hub pre **lead CRM**, projekty, GitHub/Vercel/WordPress konektory, iMessage intake a automatizácie.

| Stack           |                                       |
| --------------- | ------------------------------------- |
| Framework       | TanStack Start + React 19 + Vite 8    |
| UI              | Tailwind 4 + shadcn/Radix + lucide    |
| Data            | Supabase (Postgres + Auth + RLS)      |
| Package manager | **Bun** (preferovaný; funguje aj npm) |
| Deploy target   | Cloudflare (Nitro) / Lovable          |

---

## Rýchly štart

```bash
# 1) deps
bun install

# 2) env (už môže byť v .env z clone)
cp .env.example .env   # ak .env chýba, doplň kľúče

# 3) dev server
bun run dev
```

App beží typicky na `http://localhost:3000` (alebo port, ktorý vypíše Vite).

### Skripty

| Príkaz            | Čo robí            |
| ----------------- | ------------------ |
| `bun run dev`     | lokálny dev server |
| `bun run build`   | produkčný build    |
| `bun run preview` | preview buildu     |
| `bun run lint`    | ESLint             |
| `bun run format`  | Prettier           |

---

## Čo už je hotové

- **Auth** – Supabase signup/login (`/auth`), gate v shelli
- **DB schema + RLS** – migrácie v `supabase/migrations/`
- **Client store** – hydrate + seed demo dát per user (`src/lib/store.tsx`)
- **CRM UI** – dashboard, CRM, import lead reportov, messages, projects, …
- **Sync server functions** – GitHub / Vercel / WordPress (`src/lib/sync.functions.ts`)
- **Public webhooks** – Base44, iMessage, Vercel (`src/routes/api/public/hooks/`)

## Čo ešte nie je (roadmap)

Pozri `docs/DEV_PLAN.md`.

Stručne:

1. Overenie E2E smoke + oprava seed/import persistence bugov
2. Settings: reálny stav DB + ENV presence (server-side)
3. (Voliteľné) React Query server-fn vrstva namiesto monolitického store
4. Cron automatizácie (pg_cron)
5. Playwright smoke suite

---

## Štruktúra

```
src/
  components/     # shell, UI bits, shadcn
  integrations/   # supabase client + auth middleware
  lib/            # store, parsers, types, sync.functions
  routes/         # file-based routes (TanStack)
    api/public/hooks/   # webhook endpoints
supabase/
  migrations/     # schema + RLS
```

Routing konvencie: `src/routes/README.md`.

---

## Env premenné

Minimálne pre lokálny beh s auth:

- `VITE_SUPABASE_URL` / `SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY`

Pre webhooky a admin operácie navyše:

- `SUPABASE_SERVICE_ROLE_KEY`
- `BASE44_WEBHOOK_SECRET`
- `IMESSAGE_INTAKE_TOKEN`

Kompletný zoznam: `.env.example`.

> ⚠️ Service role a tokeny **nikdy** neprefixuj `VITE_` — musia ostať len na serveri.

---

## Lovable

Repo je napojené na Lovable. **Neforce-pushuj** a nerebase-uj už pushnutú históriu (`AGENTS.md`).

---

## Prvý dev task

Otvor `docs/DEV_PLAN.md` → **Task 0 / Prompt #1** a spusti ho v AI IDE / agentovi.
