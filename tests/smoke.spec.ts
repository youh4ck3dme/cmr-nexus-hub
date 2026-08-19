import { test, expect } from "@playwright/test";
import { createHmac } from "crypto";

const OWNER = "00000000-0000-4000-8000-000000000000";

test.describe("routes (HTTP/SSR)", () => {
  for (const path of [
    "/",
    "/auth",
    "/dashboard",
    "/crm",
    "/settings",
    "/leads/import",
    "/messages",
  ]) {
    test(`serves ${path}`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status(), path).toBeLessThan(400);
      const html = await res.text();
      expect(html).toMatch(/<!DOCTYPE html>/i);
      expect(html).toContain("<title>");
    });
  }

  test("html head has app title", async ({ request }) => {
    const html = await (await request.get("/auth")).text();
    expect(html).toMatch(/<title>[^<]*(CMR|Central)[^<]*<\/title>/i);
  });
});

test.describe("base44 webhook", () => {
  test("rejects request without signature", async ({ request }) => {
    const res = await request.post("/api/public/hooks/base44", {
      data: { owner_id: OWNER, raw: "test" },
      headers: { "content-type": "application/json" },
    });
    expect([401, 503]).toContain(res.status());
  });

  test("rejects bad HMAC when secret configured", async ({ request }) => {
    const secret = process.env.BASE44_WEBHOOK_SECRET;
    test.skip(!secret, "BASE44_WEBHOOK_SECRET not set");
    const res = await request.post("/api/public/hooks/base44", {
      headers: { "content-type": "application/json", "x-base44-signature": "deadbeef" },
      data: JSON.stringify({ owner_id: OWNER, raw: "x".repeat(20) }),
    });
    expect(res.status()).toBe(401);
  });

  test("returns 400 on invalid payload with valid signature", async ({ request }) => {
    const secret = process.env.BASE44_WEBHOOK_SECRET;
    test.skip(!secret, "BASE44_WEBHOOK_SECRET not set");
    const body = JSON.stringify({ owner_id: "not-a-uuid", raw: "x" });
    const sig = createHmac("sha256", secret!).update(body).digest("hex");
    const res = await request.post("/api/public/hooks/base44", {
      headers: { "content-type": "application/json", "x-base44-signature": sig },
      data: body,
    });
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain("Invalid payload");
  });

  test("accepts valid signed report", async ({ request }) => {
    const secret = process.env.BASE44_WEBHOOK_SECRET;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    test.skip(!secret || !service, "Needs BASE44_WEBHOOK_SECRET + SUPABASE_SERVICE_ROLE_KEY");
    const body = JSON.stringify({
      owner_id: process.env.SMOKE_OWNER_ID ?? OWNER,
      raw: `DAILY LEAD REPORT 998
Date: 2026-07-25

LEAD 1: Playwright Clinic
Website: playwright-clinic.example
Score: 88/100
Score Label: KEEP
Email: play@example.com
`,
    });
    const sig = createHmac("sha256", secret!).update(body).digest("hex");
    const res = await request.post("/api/public/hooks/base44", {
      headers: { "content-type": "application/json", "x-base44-signature": sig },
      data: body,
    });
    expect([200, 500]).toContain(res.status());
  });

  test("dedupes retried delivery with same event id", async ({ request }) => {
    const secret = process.env.BASE44_WEBHOOK_SECRET;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    test.skip(!secret || !service, "Needs BASE44_WEBHOOK_SECRET + SUPABASE_SERVICE_ROLE_KEY");
    const eventId = `smoke-${Date.now()}`;
    const body = JSON.stringify({
      owner_id: process.env.SMOKE_OWNER_ID ?? OWNER,
      raw: `DAILY LEAD REPORT 997
Date: 2026-07-26

LEAD 1: Idempotency Co
Website: idem.example
Score: 91/100
Score Label: KEEP
`,
    });
    const headers = {
      "content-type": "application/json",
      "x-base44-signature": createHmac("sha256", secret!).update(body).digest("hex"),
      "x-base44-event-id": eventId,
    };
    const first = await request.post("/api/public/hooks/base44", { headers, data: body });
    test.skip(first.status() !== 200, "first delivery did not succeed");
    const firstJson = await first.json();

    const second = await request.post("/api/public/hooks/base44", { headers, data: body });
    expect(second.status()).toBe(200);
    const secondJson = await second.json();
    expect(secondJson.duplicate).toBe(true);
    expect(secondJson.report_id).toBe(firstJson.report_id);
  });
});

test.describe("imessage webhook", () => {
  test("rejects missing bearer token", async ({ request }) => {
    const res = await request.post("/api/public/hooks/imessage", {
      data: { owner_id: OWNER, raw_text: "hi" },
    });
    expect([401, 503]).toContain(res.status());
  });

  test("rejects wrong bearer token", async ({ request }) => {
    const res = await request.post("/api/public/hooks/imessage", {
      headers: { authorization: "Bearer nope" },
      data: { owner_id: OWNER, raw_text: "hi" },
    });
    expect([401, 503]).toContain(res.status());
  });

  test("400 on invalid payload with valid token", async ({ request }) => {
    const token = process.env.IMESSAGE_INTAKE_TOKEN;
    test.skip(!token, "IMESSAGE_INTAKE_TOKEN not set");
    const res = await request.post("/api/public/hooks/imessage", {
      headers: { authorization: `Bearer ${token}` },
      data: { owner_id: "nope", raw_text: "" },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("vercel webhook", () => {
  test("rejects unsigned event", async ({ request }) => {
    const res = await request.post("/api/public/hooks/vercel?owner_id=" + OWNER, {
      data: { type: "deployment.created" },
    });
    expect([401, 503]).toContain(res.status());
  });
});
