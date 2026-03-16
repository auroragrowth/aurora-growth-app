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

  if (tokenHash && type) {
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any,
    });

    if (otpError) {
      return NextResponse.redirect(
        `${appUrl}/login?error=${encodeURIComponent(otpError.message)}`
      );
    }
  }

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.redirect(
        `${appUrl}/login?error=${encodeURIComponent(exchangeError.message)}`
      );
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  const plan = profile?.plan?.toLowerCase?.() ?? null;
  const paidPlans = ["core", "pro", "elite"];

  if (!plan || !paidPlans.includes(plan)) {
    return NextResponse.redirect(`${appUrl}/dashboard/upgrade`);
  }

  return NextResponse.redirect(`${appUrl}/dashboard`);
}
