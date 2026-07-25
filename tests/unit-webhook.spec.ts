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
