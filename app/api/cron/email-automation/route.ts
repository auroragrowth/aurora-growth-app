import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendAuroraEmail } from "@/lib/email/resend";

import { welcomeEmail } from "@/lib/email/templates/welcome";
import { day1Email } from "@/lib/email/templates/day1";
import { day2Email } from "@/lib/email/templates/day2";
import { day3Email } from "@/lib/email/templates/day3";
import { day4Email } from "@/lib/email/templates/day4";
import { day5Email } from "@/lib/email/templates/day5";
import { day7Email } from "@/lib/email/templates/day7";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getEmail(step: number, firstName: string) {
  switch (step) {
    case 0:
      return {
        subject: "Discover Aurora Growth Academy",
        html: welcomeEmail(firstName),
        nextStep: 1,
        delayHours: 24,
      };

    case 1:
      return {
        subject: "How Aurora actually works",
        html: day1Email(firstName),
        nextStep: 2,
        delayHours: 24,
      };

    case 2:
      return {
        subject: "Here’s how this works on a real stock",
        html: day2Email(firstName),
        nextStep: 3,
        delayHours: 24,
      };

    case 3:
      return {
        subject: "Why most people lose money investing",
        html: day3Email(firstName),
        nextStep: 4,
        delayHours: 24,
      };

    case 4:
      return {
        subject: "Live vs Demo: the smartest way to start",
        html: day4Email(firstName),
        nextStep: 5,
        delayHours: 24,
      };

    case 5:
      return {
        subject: "Never miss another setup",
        html: day5Email(firstName),
        nextStep: 7,
        delayHours: 48,
      };

    case 7:
      return {
        subject: "If you’re serious about investing, start with a system",
        html: day7Email(firstName),
        nextStep: 8,
        delayHours: 0,
      };

    default:
      return null;
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
      const emailData = getEmail(user.current_step, firstName);

      if (!emailData) {
        await supabase
          .from("email_automation_state")
          .update({ is_active: false })
          .eq("id", user.id);

        continue;
      }

      await sendAuroraEmail({
        to: user.email,
        subject: emailData.subject,
        html: emailData.html,
      });

      const nextSend =
        emailData.delayHours > 0
          ? new Date(Date.now() + emailData.delayHours * 60 * 60 * 1000).toISOString()
          : null;

      await supabase
        .from("email_automation_state")
        .update({
          current_step: emailData.nextStep,
          last_sent_at: new Date().toISOString(),
          next_send_at: nextSend,
          is_active: emailData.nextStep < 8,
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
