import { NextResponse } from "next/server";
import { sendAuroraEmail } from "@/lib/email/resend";
import { welcomeEmail } from "@/lib/email/templates/aurora";

export async function POST(req: Request) {
  try {
    const { email, firstName } = await req.json();

    const result = await sendAuroraEmail({
      to: email,
      subject: "Welcome to Aurora Growth Academy",
      html: welcomeEmail(firstName || "Investor"),
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Send email route error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send email" },
      { status: 500 }
    );
  }
}
