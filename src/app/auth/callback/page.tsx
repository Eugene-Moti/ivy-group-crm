"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Handles two different Supabase auth link shapes that both land here:
 *
 * - Magic link (self-service sign-in, initiated from our own login form via
 *   the browser client, which defaults to the PKCE flow): the email link
 *   redirects back with a `?code=...` query param that a server could read,
 *   exchanged via exchangeCodeForSession.
 * - Invite links (admin.inviteUserByEmail): Supabase's own docs note PKCE
 *   isn't supported here since the inviting and accepting browsers differ,
 *   so these use the older implicit flow instead — the session tokens
 *   arrive in the URL *hash fragment* (`#access_token=...`), which never
 *   reaches a server at all. Only the browser client can see it, and it
 *   parses it automatically on init (detectSessionInUrl), firing
 *   onAuthStateChange once it lands.
 *
 * This page has to run client-side and cover both cases, which is why it's
 * a page component rather than a route handler.
 */
function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const redirectTo = searchParams.get("redirectTo") || "/dashboard";
    let settled = false;

    function finish(path: string) {
      if (settled) return;
      settled = true;
      router.replace(path);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(redirectTo);
    });

    const code = searchParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
        if (exchangeError && !settled) setError(exchangeError.message);
      });
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) finish(redirectTo);
      });
    }

    const timeout = setTimeout(() => {
      if (!settled) setError("This link is invalid or has expired.");
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for this link; searchParams/router identity churn shouldn't restart the flow
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">That link didn&apos;t work</h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
        </div>
        <Link
          href="/login"
          className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold/90"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <Loader2 className="size-6 animate-spin text-gold" />
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-6 animate-spin text-gold" />
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
