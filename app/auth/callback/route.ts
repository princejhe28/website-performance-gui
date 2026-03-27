import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
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
        return NextResponse.redirect(`${origin}/auth/set-password`);
      }
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  // OAuth / email confirmation flow
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // Fallback — something went wrong, send back to login
  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
}
