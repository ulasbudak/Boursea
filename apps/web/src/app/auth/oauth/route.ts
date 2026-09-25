import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PKCE callback for OAuth sign-in and for the links Supabase emails (sign-up confirmation,
 * `flow=signup`; password reset, `flow=recovery`).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const flow = searchParams.get("flow");
  let next = searchParams.get("next") ?? "/dashboard";
  if (!next.startsWith("/")) {
    next = "/dashboard";
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const isLocalEnv = process.env.NODE_ENV === "development";
  const baseUrl = !isLocalEnv && forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
    // Supabase only hands out a code after it has verified the email link, so a failed
    // exchange here means the link was opened in a different browser than the one that
    // started the flow (the PKCE verifier cookie is missing) or was already used.
    if (flow === "signup") {
      return NextResponse.redirect(`${baseUrl}/login?notice=email_confirmed`);
    }
    return NextResponse.redirect(`${baseUrl}/error?reason=other_browser`);
  }

  // No code: Supabase rejected the link (e.g. expired). Its reason travels in the URL
  // fragment, which the browser carries over this redirect for the error page to read.
  return NextResponse.redirect(`${baseUrl}/error`);
}
