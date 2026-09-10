import { NextResponse } from "next/server";

/**
 * Wraps a private-area route handler so it ALWAYS returns JSON — an
 * unhandled throw (a missing env var, a Supabase hiccup) otherwise produces
 * an empty 500 body, which the browser surfaces as the useless
 * "Unexpected end of JSON input" instead of the real reason.
 */
export function withJson<T extends unknown[]>(
  handler: (request: Request, ...rest: T) => Promise<Response>
) {
  return async (request: Request, ...rest: T): Promise<Response> => {
    try {
      return await handler(request, ...rest);
    } catch (err) {
      console.error("Private route error:", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Unexpected server error." },
        { status: 500 }
      );
    }
  };
}
