import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEnvPresenceMap, isEnvPresent } from "@/lib/env-keys";

export type EnvStatusResult = {
  keys: Record<string, boolean>;
  supabase: {
    url: boolean;
    publishableKey: boolean;
    serviceRole: boolean;
  };
  /** Server-side quick probe: can we resolve project URL? */
  dbConfigured: boolean;
};

/**
 * Authenticated only. Returns presence flags — never secret values.
 */
export const getEnvStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<EnvStatusResult> => {
    const keys = getEnvPresenceMap();
    const url = isEnvPresent("SUPABASE_URL") || isEnvPresent("VITE_SUPABASE_URL");
    const publishableKey =
      isEnvPresent("SUPABASE_PUBLISHABLE_KEY") || isEnvPresent("VITE_SUPABASE_PUBLISHABLE_KEY");
    const serviceRole = isEnvPresent("SUPABASE_SERVICE_ROLE_KEY");

    return {
      keys,
      supabase: { url, publishableKey, serviceRole },
      dbConfigured: url && publishableKey,
    };
  });
