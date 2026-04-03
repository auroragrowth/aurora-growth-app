import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendAuroraEmail } from "@/lib/email/resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.log("Running Aurora email automation...");

    // Example: get users (you can replace this with signals/watchlist later)
    const { data: users, error } = await supabase
      .from("profiles")
      .select("email, full_name")
      .limit(10);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ success: false, error });
    }

    for (const user of users || []) {
      const html = `
        <div style="font-family: Arial; background:#0b0f1a; padding:40px; color:white;">
          <div style="max-width:600px; margin:auto; background:linear-gradient(135deg,#0f172a,#020617); padding:30px; border-radius:12px;">
            
            <h1 style="color:#22d3ee;">Aurora Update</h1>

            <p style="color:#cbd5f5;">
              Hi ${user.full_name || "Investor"},
            </p>

            <p style="color:#cbd5f5;">
              Your Aurora platform is actively scanning the market.
            </p>

            <a href="https://app.auroragrowth.co.uk/dashboard"
               style="display:inline-block; margin-top:20px; padding:12px 20px; background:#22d3ee; color:#020617; border-radius:8px; text-decoration:none;">
              View Dashboard
            </a>

            <p style="margin-top:30px; font-size:12px; color:#64748b;">
              Aurora Growth — Investment Intelligence Platform
            </p>

          </div>
        </div>
      `;

      const result = await sendAuroraEmail({
        to: user.email,
        subject: "Aurora Market Update",
        html,
      });

      if (!result.success) {
        console.error("Email failed for:", user.email, result.error);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Emails processed",
    });
  } catch (err) {
    console.error("Cron error:", err);
    return NextResponse.json(
      { success: false, error: "Cron failed" },
      { status: 500 }
    );
  }
}
