import { NextResponse } from "next/server";
import { sendAuroraEmail } from "@/lib/email/resend";
import { getOnboardingEmail } from "@/lib/email/templates/onboarding";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const day = Number(searchParams.get("day") ?? "0");
    const email = searchParams.get("email") || "paulrudland@me.com";
    const firstName = searchParams.get("firstName") || "Paul";

    const pack = getOnboardingEmail(day, firstName);

    if (!pack) {
      return NextResponse.json(
        { success: false, error: "Invalid day. Use 0 to 7." },
        { status: 400 }
      );
    }

    const result = await sendAuroraEmail({
      to: email,
      subject: pack.subject,
      html: pack.html,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      day,
      email,
      subject: pack.subject,
      result,
    });
  } catch (error) {
    console.error("test-onboarding error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send onboarding test email" },
      { status: 500 }
    );
  }
}
