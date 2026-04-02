import { NextResponse } from "next/server";
import { sendAuroraTemplateEmail } from "@/lib/email/resend";

export async function POST(req: Request) {
  try {
    const { email, firstName = "there" } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const result = await sendAuroraTemplateEmail({
      to: email,
      subject: "Discover Aurora Growth Academy",
      firstName,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Email send failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
