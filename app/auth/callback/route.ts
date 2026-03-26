import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.auroragrowth.co.uk";

  if (error) {
    return NextResponse.redirect(
      `${appUrl}/login?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  const supabase = await createClient();

  // Email confirmation link (token_hash + type)
  if (tokenHash && type) {
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as Parameters<typeof supabase.auth.verifyOtp>[0]["type"],
    });

    if (otpError) {
      return NextResponse.redirect(
        `${appUrl}/login?error=${encodeURIComponent(otpError.message)}`
      );
    }
  }

  // OAuth code exchange
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.redirect(
        `${appUrl}/login?error=${encodeURIComponent(exchangeError.message)}`
      );
    }
  }

  // Delegate all routing decisions to post-login
  return NextResponse.redirect(`${appUrl}/auth/post-login`);
}
