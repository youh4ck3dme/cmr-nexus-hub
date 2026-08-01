import { createHash } from "crypto";

export type ClaimResult =
  | { kind: "new"; id: string }
  | { kind: "duplicate"; response: Record<string, unknown> };

/** Stable event key: explicit event id when provided, otherwise sha256 of the raw body. */
export function eventKeyFor(explicitId: string | null | undefined, body: string): string {
  const trimmed = (explicitId ?? "").trim();
  if (trimmed) return `id:${trimmed.slice(0, 200)}`;
  return `sha256:${createHash("sha256").update(body).digest("hex")}`;
}

/** Read an event id from common webhook headers. */
export function eventIdFromHeaders(headers: Headers, extra: string[] = []): string | null {
  const names = [...extra, "x-event-id", "x-idempotency-key", "idempotency-key", "x-request-id"];
  for (const n of names) {
    const v = headers.get(n);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

/**
 * Atomically claim an event key. Returns `duplicate` (with the stored response of the
 * original delivery) when this key was already accepted, otherwise `new`.
 * Fails open (`new`) if the ledger itself errors, so deliveries are never lost.
 */
export async function claimWebhookEvent(params: {
  ownerId: string;
  source: string;
  eventKey: string;
}): Promise<ClaimResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("webhook_events")
    .insert({
      owner_id: params.ownerId,
      source: params.source,
      event_key: params.eventKey,
      status: "processing",
    } as never)
    .select("id")
    .single();

  if (!error && data) return { kind: "new", id: (data as { id: string }).id };

  // 23505 = unique_violation → already seen
  if (error && (error as { code?: string }).code === "23505") {
    const { data: existing } = await supabaseAdmin
      .from("webhook_events")
      .select("response")
      .eq("source", params.source)
      .eq("event_key", params.eventKey)
      .maybeSingle();
    const stored = (existing as { response?: Record<string, unknown> } | null)?.response ?? {};
    return { kind: "duplicate", response: stored };
  }

  console.error(`[webhook:${params.source}] idempotency claim failed`, error);
  return { kind: "new", id: "" };
}

/** Persist the final result of a claimed event so retries can replay it. */
export async function completeWebhookEvent(
  id: string,
  response: Record<string, unknown>,
): Promise<void> {
  if (!id) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("webhook_events")
      .update({ status: "done", response: response as never } as never)
      .eq("id", id);
  } catch (err) {
    console.error("[webhook] completeWebhookEvent failed", err);
  }
}

/** Release a claim after a failed processing attempt so a retry can succeed. */
export async function releaseWebhookEvent(id: string): Promise<void> {
  if (!id) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("webhook_events").delete().eq("id", id);
  } catch (err) {
    console.error("[webhook] releaseWebhookEvent failed", err);
  }
}
