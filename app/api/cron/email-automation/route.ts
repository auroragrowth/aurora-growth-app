import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendAuroraTemplateEmail } from "@/lib/email/resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getSubject(step: number) {
  switch (step) {
    case 0:
      return "Discover Aurora Growth Academy";
    case 1:
      return "How Aurora actually works";
    case 2:
      return "Here’s how this works on a real stock";
    case 3:
      return "Why most people lose money investing";
    case 4:
      return "Live vs Demo: the smartest way to start";
    case 5:
      return "Never miss another setup";
    case 7:
      return "If you’re serious about investing, start with a system";
    default:
      return null;
  }
}

function getNextStepData(step: number) {
  switch (step) {
    case 0: return { nextStep: 1, delayHours: 24 };
    case 1: return { nextStep: 2, delayHours: 24 };
    case 2: return { nextStep: 3, delayHours: 24 };
    case 3: return { nextStep: 4, delayHours: 24 };
    case 4: return { nextStep: 5, delayHours: 24 };
    case 5: return { nextStep: 7, delayHours: 48 };
    case 7: return { nextStep: 8, delayHours: 0 };
    default: return null;
  }
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  const { data: users, error } = await supabase
    .from("email_automation_state")
    .select("*")
    .eq("is_active", true)
    .lte("next_send_at", now)
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;

  for (const user of users || []) {
    try {
      if (user.plan) {
        await supabase
          .from("email_automation_state")
          .update({ is_active: false })
          .eq("id", user.id);
        continue;
      }

      const firstName = user.first_name || "there";
      const subject = getSubject(user.current_step);
      const nextStepData = getNextStepData(user.current_step);

      if (!subject || !nextStepData) continue;

      await sendAuroraTemplateEmail({
        to: user.email,
        subject,
        firstName,
      });

      const nextSendAt =
        nextStepData.delayHours > 0
          ? new Date(Date.now() + nextStepData.delayHours * 3600000).toISOString()
          : null;

      await supabase
        .from("email_automation_state")
        .update({
          current_step: nextStepData.nextStep,
          last_sent_at: new Date().toISOString(),
          next_send_at: nextSendAt,
          is_active: nextStepData.nextStep < 8,
        })
        .eq("id", user.id);

      sent++;
    } catch (err) {
      console.error("Email error:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    processed: users?.length || 0,
    sent,
  });
}
