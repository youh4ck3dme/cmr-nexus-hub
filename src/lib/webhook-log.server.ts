/** Best-effort error logging for public webhooks. Never throws. */
export async function logWebhookError(params: {
  ownerId?: string | null;
  source: string;
  action: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    if (!params.ownerId) {
      console.error(`[webhook:${params.source}] ${params.action}: ${params.message}`);
      return;
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("automation_logs").insert({
      owner_id: params.ownerId,
      source: params.source,
      action: params.action,
      status: "error",
      message: params.message.slice(0, 1000),
      metadata: (params.metadata ?? {}) as never,
    } as never);
  } catch (err) {
    console.error(`[webhook:${params.source}] log failed`, err);
  }
}
