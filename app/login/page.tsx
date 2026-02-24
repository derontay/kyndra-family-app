"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

type StatusKind = "idle" | "loading" | "success" | "error";

export default function LoginPage() {
  const router = useRouter();

  // Create once per page instance (client-side)
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [statusKind, setStatusKind] = useState<StatusKind>("idle");
  const [statusText, setStatusText] = useState<string>("");

  // If already signed in, bounce to /home
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) {
        // Not fatal for login UI; just show message
        setStatusKind("error");
        setStatusText(error.message);
        return;
      }

      if (data.session) {
        router.replace("/home");
      }
    })();

    // Also react to auth changes (sign-in completes, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/home");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const sendMagicLink = async () => {
    setStatusKind("loading");
    setStatusText("Sending magic link...");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatusKind("error");
      setStatusText(error.message);
      return;
    }

    setStatusKind("success");
    setStatusText("Check your email for the sign-in link.");
  };

  const signInWithGoogle = async () => {
    setStatusKind("loading");
    setStatusText("Opening Google sign-in...");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatusKind("error");
      setStatusText(error.message);
    }
    // If success, Supabase will redirect the browser; no further action needed here.
  };

  const isLoading = statusKind === "loading";

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-white/70">
          Use Google, or we’ll email you a magic link.
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={isLoading}
            className="w-full rounded-xl bg-white/90 px-4 py-3 text-black font-semibold hover:bg-white disabled:opacity-60"
          >
            Continue with Google
          </button>

          <div className="flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-white/50">OR</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <label className="block text-sm text-white/70">Email</label>
          <input
            className="mt-1 w-full rounded-xl bg-black/20 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/20"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            autoComplete="email"
          />

          <button
            type="button"
            onClick={sendMagicLink}
            disabled={isLoading || !email.trim()}
            className="w-full rounded-xl bg-white/90 px-4 py-3 text-black font-semibold hover:bg-white disabled:opacity-60"
          >
            Send magic link
          </button>

          {statusText ? (
            <p
              className={[
                "mt-3 text-sm",
                statusKind === "error" ? "text-red-300" : "text-white/80",
              ].join(" ")}
            >
              {statusText}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}