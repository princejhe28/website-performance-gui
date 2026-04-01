import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Use the trusted app origin from env to prevent open-redirect via Host header injection.
function getTrustedOrigin(requestOrigin: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // fall through to requestOrigin
    }
  }
  return requestOrigin;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const trustedOrigin = getTrustedOrigin(origin);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createClient();

  // Invite / magic-link flow
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "invite" | "magiclink" | "recovery",
    });

    if (!error) {
      // Send invited users to the set-password page
      if (type === "invite" || type === "recovery") {
        return NextResponse.redirect(`${trustedOrigin}/auth/set-password`);
      }
      return NextResponse.redirect(`${trustedOrigin}/dashboard`);
    }
  }

  // OAuth / email confirmation flow
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(`${trustedOrigin}/dashboard`);
  }

  // Fallback — something went wrong, send back to login
  return NextResponse.redirect(`${trustedOrigin}/login?error=auth_callback_failed`);
}
