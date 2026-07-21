## Cieľ
Z nahraného obrázka (roboto-grafiti.webp) vygenerovať kompletnú sadu PWA / app ikon pre CMR Central a zapojiť ich do aplikácie ako inštalovateľnú PWA (manifest-only, bez service workera – v Lovable preview by inak robil problémy). Na úvodnej / splash obrazovke pridať "luxury 4D parallax" prezentáciu robota.

## Čo sa vygeneruje (assets)

Zdroj: `user-uploads://roboto-grafiti.webp` → cez `imagegen--edit_image` sa pripraví štvorcová verzia (robot centrovaný, čistý okraj) a maskovateľná verzia (safe-zone padding pre Android adaptive icons).

Uložené do `public/icons/` + pointery cez `lovable-assets` kde má zmysel (veľké PNG). Favicony do rootu `public/`.

Favicon / web:
- `public/favicon.ico` (multi-size 16/32/48) – nahradí default Lovable
- `public/favicon-16.png`, `favicon-32.png`, `favicon-48.png`
- `public/icons/icon.svg` (monochrome-friendly maskovaná verzia pre `mask-icon`)

Apple / iPhone / iPad:
- `apple-touch-icon.png` 180×180 (primárna)
- `apple-touch-icon-152.png` (iPad), `-167.png` (iPad Pro), `-120.png` (iPhone @2x)
- `apple-splash-*` (voliteľné, 2–3 najčastejšie iPhone rozlíšenia: 1290×2796, 1170×2532, 828×1792) – tmavé pozadie, robot v strede

Android / PWA:
- `icons/icon-192.png`, `icon-512.png` (any)
- `icons/maskable-192.png`, `icons/maskable-512.png` (purpose: maskable, so safe zone)
- `icons/icon-96.png`, `icon-144.png` (staršie Android launchery)

Microsoft:
- `icons/mstile-150.png`, `browserconfig.xml`

Manifest:
- `public/manifest.webmanifest` – name "CMR Central", short_name "CMR", theme_color zladené s dark tokenmi (`--background`), background_color, display `standalone`, icons array so `sizes`/`type`/`purpose`, `start_url: "/"`, `scope: "/"`, `lang: "sk"`.

## Zapojenie do aplikácie

`src/routes/__root.tsx` – v `head().links` a `meta`:
- `<link rel="icon" href="/favicon.ico">` (nahradiť existujúci)
- `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">` a 16
- `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">` + varianty
- `<link rel="mask-icon" href="/icons/icon.svg" color="...">`
- `<link rel="manifest" href="/manifest.webmanifest">`
- `<meta name="theme-color" content="...">` (dark hodnota z tokenu)
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- `<meta name="apple-mobile-web-app-title" content="CMR">`
- `<meta name="application-name" content="CMR Central">`
- `<meta name="msapplication-TileColor">` + `TileImage`

Zmazať staré `public/favicon.ico` (default) a nahradiť novým.

Podľa PWA skillu **nepridávame** `vite-plugin-pwa`, service worker, ani inštalačné promptovanie – užívateľ nežiadal offline, len ikony + PWA metadata (manifest-only home-screen support). Inštalovateľné to bude (Android Chrome install prompt, iOS "Add to Home Screen").

## Luxury 4D parallax

Nová komponenta `src/components/robot-parallax.tsx` – umiestnená na dashboard hero / prihlasovacej ploche (podľa toho čo je landing = aktuálne `/` = dashboard):

- Vrstvy (z odvodených variantov obrázka cez `imagegen--edit_image`):
  1. pozadie – rozmazané graffiti steny (blur, tmavý overlay)
  2. midground – farebné splashe / lebky
  3. foreground – samotný robot (s jemným glow okolo očí)
  4. glare / noise overlay – jemný film grain + radial highlight

- 4D efekt: mouse-move + device-orientation (`deviceorientation` event pre mobil) → každá vrstva sa posúva iným `translate3d` a mierne `rotateX/Y` (perspective 1200px na wrapperi). Rozsah tlmený `spring` (framer-motion, ak už je v projekte; inak čistý `requestAnimationFrame` s lerp – žiadna nová dependencia).
- Reduced-motion: `prefers-reduced-motion: reduce` → parallax vypnutý, ostane statický render.
- Performance: vrstvy `will-change: transform`, `pointer-events-none`, lazy mount (IntersectionObserver), aby nespomalilo scroll na mobile.
- Umiestnenie: hero blok na `/dashboard` (a/alebo `/` redirect target), výška `~40vh` na mobile, `~55vh` na desktop, zaoblený radius, jemný ring `--border`.

## Technické poznámky

- Ikony generujem cez `imagegen--edit_image` s cieľovými rozmermi (napr. 512×512 zdroj → `sharp`-like downscale robí `imagegen`). Pre presné veľkosti < 512 (favicon 32/16) sa vyrenderuje 512 a klientsky sa nič nedeje – prehliadač si škáluje; kritické veľkosti (180, 192, 512, 1024) sa generujú natívne.
- `favicon.ico` vytvorím z 32/48 PNG cez `code--exec` (ImageMagick / `png-to-ico` cez `bunx`).
- Veľké splash / hero varianty (>200 kB) idú cez `lovable-assets` pointer a použijú sa v parallax komponente ako `<img src={asset.url}>`. Malé ikony (`<50 kB`) ostávajú priamo v `public/` (musia byť servované z rootu pre PWA konvenciu).
- Manifest ikony musia byť skutočné súbory v `public/`, nie `lovable-assets` URL (inštalátory ich ťahajú relatívne k origin scope).
- `theme_color` v manifeste = konkrétna hex hodnota zodpovedajúca `--background` v dark móde (`.dark`), lebo manifest CSS premenné nečíta.

## Deliverables checklist

1. Sada favicon / apple-touch / android / maskable / mstile PNG + `favicon.ico` v `public/`.
2. `public/manifest.webmanifest` + `public/browserconfig.xml`.
3. Aktualizovaný `src/routes/__root.tsx` (linky, meta, theme-color, manifest, apple metadata).
4. Zmazaný default `public/favicon.ico`.
5. Nová `RobotParallax` komponenta + integrácia na dashboard hero.
6. Reduced-motion fallback + mobilný gyroscope parallax.

Nezasahuje do business logiky, CRM, connectorov ani store — čisto assets + head + jedna prezentačná komponenta.
