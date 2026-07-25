/** ENV keys shown in Settings — presence only, never values. */
export const TRACKED_ENV_KEYS = [
  "GITHUB_TOKEN",
  "GITHUB_API_KEY",
  "LOVABLE_API_KEY",
  "VERCEL_TOKEN",
  "BASE44_WEBHOOK_SECRET",
  "IMESSAGE_INTAKE_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
  "WORDPRESS_SITE_URL",
  "WORDPRESS_USERNAME",
  "WORDPRESS_APP_PASSWORD",
  "WORDPRESS_API_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "CRM_AUTH_TOKEN",
  "OPENAI_API_KEY",
  "MISTRAL_API_KEY",
] as const;

export type TrackedEnvKey = (typeof TRACKED_ENV_KEYS)[number];

/** True if env var is set and non-empty after trim. */
export function isEnvPresent(key: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const v = env[key];
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Effective presence with aliases (UI keys map to real server names).
 * GITHUB_TOKEN ⇔ GITHUB_API_KEY, etc.
 */
export function isEnvEffectivelyPresent(
  key: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (isEnvPresent(key, env)) return true;
  if (key === "GITHUB_TOKEN" && isEnvPresent("GITHUB_API_KEY", env)) return true;
  if (key === "GITHUB_API_KEY" && isEnvPresent("GITHUB_TOKEN", env)) return true;
  if (key === "WORDPRESS_API_KEY") {
    // App-password triple can stand in for gateway key in checklist terms
    return (
      isEnvPresent("WORDPRESS_SITE_URL", env) &&
      isEnvPresent("WORDPRESS_USERNAME", env) &&
      isEnvPresent("WORDPRESS_APP_PASSWORD", env)
    );
  }
  return false;
}

export function getEnvPresenceMap(
  env: NodeJS.ProcessEnv = process.env,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of TRACKED_ENV_KEYS) {
    out[key] = isEnvEffectivelyPresent(key, env);
  }
  return out;
}
