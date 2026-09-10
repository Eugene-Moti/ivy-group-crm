import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";
import { TWO_FA_COOKIE, verifyTwoFaToken } from "@/lib/auth-2fa/verified";

// /api/webhooks and /api/cron authenticate themselves with a Bearer secret
// (an external service or Vercel Cron, never a logged-in browser session) —
// without this, the session gate below 307s every call of theirs to /login
// before the route handler ever runs.
const PUBLIC_PATHS = ["/login", "/auth/callback", "/api/webhooks", "/api/cron"];

// Reachable with a session but BEFORE the emailed code has been entered.
const TWO_FA_VERIFY_PATH = "/login/verify";
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
    const twoFaResult = resolveTwoFa(request, claims, pathname);
    if (twoFaResult) return twoFaResult;
  }

  return supabaseResponse;
}

type Claims = { sub?: unknown; session_id?: unknown };

function resolveTwoFa(
  request: NextRequest,
  claims: Claims,
  pathname: string
): NextResponse | null {
  if (process.env.DISABLE_LOGIN_2FA === "true") return null;

  const onLoginRoot = pathname === "/login";
  const onVerify = pathname === TWO_FA_VERIFY_PATH;
  const exempt =
    onLoginRoot || onVerify || TWO_FA_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));

  const userId = typeof claims.sub === "string" ? claims.sub : "";
  const sessionId = typeof claims.session_id === "string" ? claims.session_id : "";
  if (!userId || !sessionId) return null; // odd token — don't gate, password already held

  const verified = verifyTwoFaToken(
    request.cookies.get(TWO_FA_COOKIE)?.value,
    userId,
    sessionId
  );

  if (verified) {
    if (onLoginRoot || onVerify) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return null;
  }

  if (exempt) return null;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Second factor required" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = TWO_FA_VERIFY_PATH;
  url.search = "";
  return NextResponse.redirect(url);
}
