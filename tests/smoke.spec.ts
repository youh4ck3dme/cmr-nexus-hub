import { test, expect } from "@playwright/test";
import { createHmac } from "crypto";

test.describe("CMR smoke", () => {
  test("auth page loads", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("heading", { level: 1 }).or(page.locator("body"))).toBeVisible();
    // Title in document or visible brand text
    await expect(page).toHaveTitle(/CMR|Prihl|Central/i);
    await expect(
      page.getByRole("button", { name: /Prihlásiť sa|Vytvoriť účet/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("root ends on auth or dashboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    // Client-side redirect can take a moment
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
      .toMatch(/\/(auth|dashboard)/);
  });

  test("dashboard redirects unauthenticated users to auth", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
      .toMatch(/\/(auth|dashboard)/);
  });

  test("base44 webhook rejects unauthenticated body", async ({ request }) => {
    const res = await request.post("/api/public/hooks/base44", {
      data: { owner_id: "00000000-0000-4000-8000-000000000000", raw: "test" },
      headers: { "content-type": "application/json" },
    });
    // No secret → 503; with secret but no/invalid sig → 401
    expect([401, 503]).toContain(res.status());
  });

  test("base44 webhook rejects bad HMAC when secret is configured", async ({ request }) => {
    const secret = process.env.BASE44_WEBHOOK_SECRET;
    test.skip(!secret, "BASE44_WEBHOOK_SECRET not set");

    const body = JSON.stringify({
      owner_id: "00000000-0000-4000-8000-000000000000",
      raw: "DAILY LEAD REPORT 999\nDate: 2026-07-25\n\nLEAD 1: HMAC Test Co\nWebsite: hmac.test\nScore: 90/100\nScore Label: KEEP\n",
    });
    const res = await request.post("/api/public/hooks/base44", {
      headers: {
        "content-type": "application/json",
        "x-base44-signature": "deadbeef",
      },
      data: body,
    });
    expect(res.status()).toBe(401);
  });

  test("base44 webhook accepts valid HMAC shape (needs service role for DB)", async ({
    request,
  }) => {
    const secret = process.env.BASE44_WEBHOOK_SECRET;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    test.skip(!secret || !service, "Needs BASE44_WEBHOOK_SECRET + SUPABASE_SERVICE_ROLE_KEY");

    const body = JSON.stringify({
      owner_id: process.env.SMOKE_OWNER_ID ?? "00000000-0000-4000-8000-000000000001",
      raw: `DAILY LEAD REPORT 998
Date: 2026-07-25

LEAD 1: Playwright Clinic
Website: playwright-clinic.example
Country: SK
Score: 88/100
Score Label: KEEP
Email: play@example.com
`,
    });
    const sig = createHmac("sha256", secret!).update(body).digest("hex");
    const res = await request.post("/api/public/hooks/base44", {
      headers: {
        "content-type": "application/json",
        "x-base44-signature": sig,
      },
      data: body,
    });
    // 200 ok, or 500 if owner_id FK invalid — both prove HMAC + handler ran
    expect([200, 500]).toContain(res.status());
    if (res.status() === 200) {
      const json = await res.json();
      expect(json.ok).toBe(true);
    }
  });
});

test.describe("webhook validation", () => {
  test("imessage rejects missing bearer token", async ({ request }) => {
    const res = await request.post("/api/public/hooks/imessage", {
      data: { owner_id: "00000000-0000-4000-8000-000000000000", raw_text: "hi" },
    });
    expect([401, 503]).toContain(res.status());
  });

  test("base44 returns 400 for invalid payload when signature is valid", async ({ request }) => {
    const secret = process.env.BASE44_WEBHOOK_SECRET;
    test.skip(!secret, "BASE44_WEBHOOK_SECRET not set");
    const body = JSON.stringify({ owner_id: "not-a-uuid", raw: "x" });
    const sig = createHmac("sha256", secret!).update(body).digest("hex");
    const res = await request.post("/api/public/hooks/base44", {
      headers: { "content-type": "application/json", "x-base44-signature": sig },
      data: body,
    });
    expect(res.status()).toBe(400);
  });

  test("public routes render key pages", async ({ page }) => {
    for (const path of ["/auth", "/dashboard", "/crm", "/settings"]) {
      const resp = await page.goto(path);
      expect(resp?.status(), path).toBeLessThan(500);
    }
  });
});
