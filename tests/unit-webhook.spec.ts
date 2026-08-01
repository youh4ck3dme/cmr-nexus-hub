import { test, expect } from "@playwright/test";
import { hmacSha256Hex, verifyHmacSha256Hex } from "../src/lib/webhook-crypto";
import { getEnvPresenceMap, isEnvEffectivelyPresent } from "../src/lib/env-keys";
import { normalizeDate, asDbLead } from "../src/lib/db-map";
import type { Lead } from "../src/lib/types";

test("hmac verify accepts matching signature", () => {
  const body = JSON.stringify({ owner_id: "x", raw: "y" });
  const secret = "s3cret";
  const sig = hmacSha256Hex(secret, body);
  expect(verifyHmacSha256Hex(secret, body, sig)).toBe(true);
});

test("hmac verify rejects wrong signature", () => {
  expect(verifyHmacSha256Hex("s3cret", "body", "abadc0ffee")).toBe(false);
});

test("normalizeDate handles DMY and ISO", () => {
  expect(normalizeDate("2026-07-25")).toBe("2026-07-25");
  expect(normalizeDate("25/07/2026")).toBe("2026-07-25");
});

test("asDbLead strips non-uuid source_report_id", () => {
  const lead = {
    id: "not-a-uuid",
    company_name: "Acme",
    score_total: 10,
    score_max: 100,
    score_label: "KEEP",
    status: "new",
    decision_makers: [],
    sources: [],
    drafts: [],
    warnings: [],
    source_report_id: "rep_demo",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Lead;
  const row = asDbLead(lead, "11111111-1111-4111-8111-111111111111");
  expect(row.source_report_id).toBeNull();
  expect(row.id).toBeUndefined();
  expect(row.company_name).toBe("Acme");
});

test("GITHUB_TOKEN alias works for GITHUB_API_KEY", () => {
  const env = { GITHUB_API_KEY: "ghp_x" } as NodeJS.ProcessEnv;
  expect(isEnvEffectivelyPresent("GITHUB_TOKEN", env)).toBe(true);
  const map = getEnvPresenceMap(env);
  expect(map.GITHUB_TOKEN).toBe(true);
});

test("base44 schema rejects short raw and bad uuid", async () => {
  const { base44PayloadSchema } = await import("../src/lib/webhook-schemas");
  expect(base44PayloadSchema.safeParse({ owner_id: "nope", raw: "x" }).success).toBe(false);
  expect(
    base44PayloadSchema.safeParse({
      owner_id: "11111111-1111-4111-8111-111111111111",
      raw: "DAILY LEAD REPORT 1\nDate: 2026-07-25\n",
    }).success,
  ).toBe(true);
});

test("imessage schema defaults source to imessage", async () => {
  const { imessagePayloadSchema } = await import("../src/lib/webhook-schemas");
  const res = imessagePayloadSchema.safeParse({
    owner_id: "11111111-1111-4111-8111-111111111111",
    raw_text: "Ahoj, mam zaujem",
  });
  expect(res.success).toBe(true);
  if (res.success) expect(res.data.source).toBe("imessage");
  expect(
    imessagePayloadSchema.safeParse({
      owner_id: "11111111-1111-4111-8111-111111111111",
      raw_text: "hi",
      source: "carrier-pigeon",
    }).success,
  ).toBe(false);
});
