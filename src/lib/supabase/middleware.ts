import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";
import { TWO_FA_COOKIE, verifyTwoFaToken } from "@/lib/auth-2fa/verified";

// /api/webhooks and /api/cron authenticate themselves with a Bearer secret
// (an external service or Vercel Cron, never a logged-in browser session) —
// without this, the session gate below 307s every call of theirs to /login
// before the route handler ever runs.
const PUBLIC_PATHS = ["/login", "/auth/callback", "/api/webhooks", "/api/cron"];

// Reachable with a session but BEFORE the second factor is cleared.
const TWO_FA_PATHS = ["/login/verify", "/login/enroll"];
const TWO_FA_EXEMPT_PREFIXES = ["/api/2fa/", "/api/webhooks", "/api/cron", "/auth/callback"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // IMPORTANT: avoid writing logic between createServerClient and
  // getClaims() — a stray return here can randomly log users out by
  // dropping the refreshed session cookie.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const isAuthed = !!claims;

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!isAuthed && !isPublicPath) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthed) {
    const twoFaResult = await resolveTwoFa(request, supabase, claims, pathname).catch((err) => {
      // Never let a 2FA hiccup take the whole app down — a broken check
      // falls back to password-only (still authenticated), and the
      // DISABLE_LOGIN_2FA kill switch is the deliberate override.
      console.error("2FA middleware check failed, passing through:", err);
      return null;
    });
    if (twoFaResult) return twoFaResult;
  }

  return supabaseResponse;
}

type Claims = { sub?: unknown; session_id?: unknown };

async function resolveTwoFa(
  request: NextRequest,
  supabase: ReturnType<typeof createServerClient<Database>>,
  claims: Claims,
  pathname: string
): Promise<NextResponse | null> {
  const disabled = process.env.DISABLE_LOGIN_2FA === "true";
  const onTwoFaPath = TWO_FA_PATHS.includes(pathname);
  const onLoginRoot = pathname === "/login";
  const exempt =
    onLoginRoot ||
    onTwoFaPath ||
    TWO_FA_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));

  const userId = typeof claims.sub === "string" ? claims.sub : "";
  const sessionId = typeof claims.session_id === "string" ? claims.session_id : "";

  const verified =
    disabled ||
    (!!userId &&
      !!sessionId &&
      verifyTwoFaToken(request.cookies.get(TWO_FA_COOKIE)?.value, userId, sessionId));

  if (verified) {
    // Past the second factor — get off the auth pages.
    if (onLoginRoot || onTwoFaPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return null;
  }

  // Not verified. Figure out enrol vs verify (needs the DB — if it errors,
  // the .catch() in the caller passes the request through).
  const { data: enrolled, error } = await supabase.rpc("has_2fa");
  if (error) throw new Error(`has_2fa rpc: ${error.message}`);
  const wantPath = enrolled ? "/login/verify" : "/login/enroll";

  if (exempt) {
    // On /login, /login/verify, /login/enroll, or an exempt API path.
    if (onTwoFaPath && pathname !== wantPath) {
      const url = request.nextUrl.clone();
      url.pathname = wantPath;
      url.search = "";
      return NextResponse.redirect(url);
    }
    return null;
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Second factor required" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = wantPath;
  url.search = "";
  return NextResponse.redirect(url);
}
