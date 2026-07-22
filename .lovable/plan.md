# CMR Central – Blueprint na plné sfunkčnenie

## Aktuálny stav (čo reálne funguje vs. nefunguje)

**Funguje (UI vrstva):**
- Routing, dark shell, sidebar/bottom-nav, PWA ikony, manifest, parallax hero
- Všetky stránky sa renderujú z **in-memory demo dát** (`src/lib/demo-data.ts`)
- Parsery Base44 reportov a iMessage intake (čisto klientské)

**Nefunguje (nikdy nebolo naozaj zapojené):**
1. **Perzistencia** – všetko žije v `useState` v `StoreProvider`. Refresh = strata dát. Žiadna DB.
2. **Autentifikácia** – žiadny login, žiadne role, každý má prístup ku všetkému.
3. **CRM zápisy** – `addLead/updateLead/addReport` menia len RAM.
4. **Import Base44 reportov** – parser beží, ale výsledok sa nikam neuloží natrvalo.
5. **GitHub konektor** – žiadne volanie, `repos` sú demo dáta.
6. **Vercel konektor** – `deployments` sú demo, žiadny webhook, žiadne API.
7. **WordPress konektor** – tabuľka len zobrazuje mock; žiadne `/wp-json` volanie.
8. **Messages / iMessage intake** – žiadny endpoint pre Apple Shortcut webhook.
9. **Automations** – toggle prepína len farbu badge; žiadny scheduler, žiadny beh.
10. **Logs** – statické demo, nič sa doň nezapisuje.
11. **Settings → ENV** – checklist ukazuje natvrdo „chýba" pre všetky kľúče, neoveruje realitu.
12. **SEO/head na leaf routes** – väčšina stránok má len `title`, chýba description/OG/twitter.
13. **`beforeLoad` redirect na `/`** – funguje, ale znamená že `/` nemá vlastný obsah/SEO.

---

## Blueprint – jeden veľký krok, ktorý všetko sfunkční

### Fáza A – Backend fundament (Lovable Cloud + Auth)
1. Zapnúť **Lovable Cloud**.
2. Migrácia so schémou + RLS + GRANT-mi pre všetky domény:
   - `profiles`, `user_roles` (+ enum `app_role`, `has_role()` SECURITY DEFINER)
   - `clients`, `leads`, `lead_reports`, `follow_ups`
   - `projects`, `repos`, `deployments`, `wordpress_sites`
   - `message_intakes`, `automations`, `automation_logs`
   - `connectors` (status/metadata, NIE tajomstvá)
   - Deterministické seed INSERTy z `demo-data.ts` v tej istej migrácii.
3. **Auth**: email+password + Google. Route gate `src/routes/_authenticated/` presunúť pod ňu všetky chránené stránky. `/auth` login screen. `/` → redirect na `/dashboard` len ak prihlásený, inak `/auth`.
4. **RLS pravidlá**: authenticated user vidí len svoje záznamy (owner_id = auth.uid()); admin (`has_role`) vidí všetko.

### Fáza B – Store → DB
5. Prepísať `src/lib/store.tsx` z RAM na **TanStack Query** hooky (loader pattern: `ensureQueryData` + `useSuspenseQuery`) volajúce `createServerFn` s `requireSupabaseAuth`.
6. Server functions v `src/lib/*.functions.ts`:
   - `listLeads`, `createLead`, `updateLead`, `importBase44Report`
   - `listProjects`, `listRepos`, `listDeployments`, `listWordPressSites`
   - `listMessages`, `createMessageIntake`
   - `listAutomations`, `toggleAutomation`, `listLogs`
   - `listConnectors`, `getConnectorHealth`
7. Mutácie robia `queryClient.invalidateQueries` → UI sa refreshuje bez reloadu.

### Fáza C – Reálne konektory (App connectors cez `standard_connectors--connect`)
8. **GitHub** connector → server fn `syncRepos()` ťahá repo/commits do `repos` tabuľky.
9. **Vercel** connector → server fn `syncDeployments()` + verejný route `/api/public/vercel-webhook` (HMAC verify) pre real-time updates.
10. **WordPress** connector → `syncWordPressSites()` cez `/wp-json/wp/v2` (health, verzia, počet postov).
11. **Slack/Email** (voliteľné) pre follow-up notifikácie.
12. `connectors` tabuľka drží live status (`healthy|degraded|down|missing_env`) namiesto mock hodnôt v Settings.

### Fáza D – Verejné webhooky
13. `src/routes/api/public/base44-webhook.ts` – prijme JSON report, HMAC verify (`BASE44_WEBHOOK_SECRET`), vloží do `lead_reports` + rozparsuje leady.
14. `src/routes/api/public/imessage-intake.ts` – pre Apple Shortcut, token-based auth (`CRM_AUTH_TOKEN` header), zápis do `message_intakes`.
15. Oba secrety cez `generate_secret` / `add_secret`.

### Fáza E – Automatizácie reálne
16. Tabuľka `automations` má `schedule_cron`. Cez **pg_cron** volať `/api/public/run-automation?id=…` (stable URL). Zápis do `automation_logs`.
17. Toggle v UI reálne zapne/vypne cron job (server fn s admin RPC).

### Fáza F – SEO, PWA polish, bezpečnosť
18. Každá leaf route dostane vlastný `head()` s title/description/og:title/og:description/twitter:card.
19. `src/routes/index.tsx` – nechať redirect, ale pridať vlastný `/` landing pre nelogovaných (marketing + „Sign in") s OG obrázkom.
20. Spustiť `security--run_security_scan` po dokončení, opraviť findings.
21. Doplniť memory súbory: `mem://features/auth`, `mem://features/connectors`, `mem://index.md`.

### Fáza G – Verifikácia
22. Build check, TS check, dev server sanity.
23. Playwright: login → dashboard → import Base44 report → verify lead sa objaví po refreshi → toggle automation → logs zapíše záznam.
24. Screenshoty desktop + mobile (420px).

---

## Technické detaily

**Nové súbory (výber):**
```
supabase/migrations/<ts>_init_cmr_schema.sql
src/routes/_authenticated/route.tsx          (auth gate)
src/routes/_authenticated/dashboard.tsx      (presun)
src/routes/_authenticated/{crm,projects,...}.tsx
src/routes/auth.tsx
src/routes/api/public/base44-webhook.ts
src/routes/api/public/imessage-intake.ts
src/routes/api/public/vercel-webhook.ts
src/routes/api/public/run-automation.ts
src/lib/leads.functions.ts
src/lib/projects.functions.ts
src/lib/connectors.functions.ts
src/lib/automations.functions.ts
src/lib/queries.ts                           (queryOptions factory)
```

**Zmenené:**
```
src/lib/store.tsx                            (mount len UI stav: theme; ostatné cez Query)
src/routes/__root.tsx                        (auth listener, session provider)
src/routes/index.tsx                         (podmienený redirect)
src/routes/*                                 (presun pod _authenticated + vlastné head())
```

**Zmazané:** žiadne — `demo-data.ts` sa použije ako zdroj seedov v migrácii, potom môže zostať pre offline dev.

**Konektory (volania):** `standard_connectors--list_app_connectors` → `--connect` pre `github`, `vercel`, `wordpress`. Secrets sa injektujú do `process.env` na serveri; nikdy do klienta.

**Bezpečnosť:**
- Roly cez `user_roles` + `has_role()` (nikdy nie na `profiles`).
- Webhooky: HMAC + `timingSafeEqual`.
- Žiadny `supabaseAdmin` mimo verifikovaných serverových operácií.
- Zod validácia každého vstupu server fn / verejného route.

---

## Prečo „na jeden krát" reálne funguje
Všetky zmeny sú **aditívne** okrem prepisu `store.tsx` a presunu route súborov pod `_authenticated/`. Migrácia + server fns + auth gate sú nezávislé bloky, ktoré sa dajú vygenerovať paralelne. Konektory sa dajú zapojiť postupne — kým konektor nie je nalinkovaný, príslušný `sync*` vracia `missing_env` a UI to zobrazí (namiesto pádu).

Po odsúhlasení pokračujem v build móde v uvedenom poradí Fáz A→G.
