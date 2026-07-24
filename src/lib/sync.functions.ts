import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Sync connectors → DB. All writes RLS-scoped to caller via context.supabase.

const GATEWAY = "https://connector-gateway.lovable.dev";

function requireLovableKey() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY missing");
  return k;
}

async function gatewayFetch(
  connectorId: string,
  path: string,
  connectionKey: string,
  init?: RequestInit,
) {
  const res = await fetch(`${GATEWAY}/${connectorId}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${requireLovableKey()}`,
      "X-Connection-Api-Key": connectionKey,
    },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${connectorId} ${path} → ${res.status}: ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : null;
}

// ---------- GitHub ----------

export const syncRepos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = process.env.GITHUB_API_KEY;
    if (!key) return { ok: false, reason: "GitHub connector not linked", count: 0 };

    const repos = (await gatewayFetch(
      "github",
      "/user/repos?per_page=50&sort=updated",
      key,
    )) as Array<{
      id: number;
      name: string;
      full_name: string;
      html_url: string;
      default_branch: string;
      open_issues_count: number;
      pushed_at: string;
    }>;

    const rows = repos.map((r) => ({
      owner_id: context.userId,
      name: r.full_name,
      provider: "github" as const,
      repo_url: r.html_url,
      default_branch: r.default_branch,
      last_commit: r.pushed_at,
      open_issues: r.open_issues_count ?? 0,
      open_prs: 0,
      status: "healthy" as const,
    }));

    // Wipe non-mock github rows and reinsert. Keeps store simple.
    await context.supabase
      .from("repos")
      .delete()
      .eq("owner_id", context.userId)
      .eq("provider", "github");
    if (rows.length) {
      const { error } = await context.supabase.from("repos").insert(rows);
      if (error) throw error;
    }
    await logSync(context, "github", "syncRepos", `Synced ${rows.length} repos`);
    return { ok: true, count: rows.length };
  });

// ---------- Vercel (direct token, no gateway) ----------

export const syncDeployments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const token = process.env.VERCEL_TOKEN;
    if (!token) return { ok: false, reason: "VERCEL_TOKEN not set", count: 0 };

    const res = await fetch("https://api.vercel.com/v6/deployments?limit=30", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Vercel ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as {
      deployments: Array<{
        uid: string;
        name: string;
        url: string;
        state: string;
        target?: string | null;
        meta?: { githubCommitSha?: string; githubCommitRef?: string };
        created: number;
      }>;
    };

    const map: Record<string, "ready" | "building" | "error" | "queued" | "mock"> = {
      READY: "ready",
      BUILDING: "building",
      ERROR: "error",
      QUEUED: "queued",
      CANCELED: "error",
    };
    const rows = json.deployments.map((d) => ({
      owner_id: context.userId,
      provider: "vercel" as const,
      deployment_url: `https://${d.url}`,
      production_url: d.target === "production" ? `https://${d.url}` : null,
      status: map[d.state] ?? "mock",
      branch: d.meta?.githubCommitRef ?? "main",
      commit_hash: d.meta?.githubCommitSha?.slice(0, 7) ?? null,
      created_at: new Date(d.created).toISOString(),
    }));

    await context.supabase
      .from("deployments")
      .delete()
      .eq("owner_id", context.userId)
      .eq("provider", "vercel");
    if (rows.length) {
      const { error } = await context.supabase.from("deployments").insert(rows);
      if (error) throw error;
    }
    await logSync(context, "vercel", "syncDeployments", `Synced ${rows.length} deployments`);
    return { ok: true, count: rows.length };
  });

// ---------- WordPress ----------

export const syncWordPress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = process.env.WORDPRESS_API_KEY;
    if (!key) return { ok: false, reason: "WordPress connector not linked", count: 0 };

    // WP REST doesn't expose "site info" uniformly; fetch users/me to prove auth,
    // then read posts count via /posts?per_page=1 headers.
    const me = (await gatewayFetch("wordpress", "/users/me", key)) as {
      id: number;
      name?: string;
      url?: string;
    };
    const settings = await gatewayFetch("wordpress", "/settings", key).catch(() => null);
    const siteUrl =
      (settings as { url?: string } | null)?.url ??
      me.url ??
      process.env.LOVABLE_CONNECTOR_WORDPRESS_SITE_URL ??
      "";

    const row = {
      owner_id: context.userId,
      name: (settings as { title?: string } | null)?.title ?? me.name ?? "WordPress",
      site_url: siteUrl,
      admin_url: siteUrl ? `${siteUrl.replace(/\/$/, "")}/wp-admin` : "",
      status: "healthy" as const,
      wp_version: null as string | null,
      plugins_count: null as number | null,
      theme: null as string | null,
    };

    await context.supabase
      .from("wordpress_sites")
      .delete()
      .eq("owner_id", context.userId);
    const { error } = await context.supabase.from("wordpress_sites").insert(row);
    if (error) throw error;
    await logSync(context, "wordpress", "syncWordPress", `Synced site ${row.name}`);
    return { ok: true, count: 1 };
  });

async function logSync(
  context: { supabase: { from: (t: string) => { insert: (r: unknown) => Promise<unknown> } }; userId: string },
  source: string,
  action: string,
  message: string,
) {
  await context.supabase.from("automation_logs").insert({
    owner_id: context.userId,
    source,
    action,
    status: "success",
    message,
  });
}