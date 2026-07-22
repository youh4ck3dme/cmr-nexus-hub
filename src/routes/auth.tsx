import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Command, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth-context";
import { Card, BtnPrimary, BtnGhost } from "@/components/ui-bits";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Prihlásenie · CMR Central" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [session, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: displayName || email },
          },
        });
        if (error) throw error;
        setInfo("Účet vytvorený. Ak je zapnutá verifikácia e-mailu, potvrď odkaz v pošte.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const signInGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (res.error) throw res.error instanceof Error ? res.error : new Error(String(res.error));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid place-items-center bg-background px-4 py-10">
      <Card className="w-full max-w-md p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <Command className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold">CMR Central</div>
            <div className="text-xs text-muted-foreground">
              {mode === "signin" ? "Prihlásenie do interného systému" : "Vytvorenie účtu"}
            </div>
          </div>
        </div>

        <BtnGhost
          type="button"
          onClick={signInGoogle}
          disabled={busy}
          className="w-full justify-center"
        >
          Prihlásiť sa cez Google
        </BtnGhost>

        <div className="flex items-center gap-3 text-[11px] uppercase text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> alebo e-mail <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Meno</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tvoje meno"
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">E-mail</label>
            <input
              type="email"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Heslo</label>
            <input
              type="password"
              required
              minLength={8}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
              {info}
            </div>
          )}
          <BtnPrimary type="submit" disabled={busy} className="w-full justify-center">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Prihlásiť sa" : "Vytvoriť účet"}
          </BtnPrimary>
        </form>

        <div className="text-center text-xs text-muted-foreground">
          {mode === "signin" ? "Nemáš účet? " : "Už máš účet? "}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setInfo(null);
            }}
          >
            {mode === "signin" ? "Vytvoriť" : "Prihlásiť sa"}
          </button>
        </div>
      </Card>
    </div>
  );
}