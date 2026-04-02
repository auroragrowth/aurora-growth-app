import { NextResponse } from "next/server";
import { sendAuroraEmail } from "@/lib/email/resend";
import { welcomeEmail } from "@/lib/email/templates/welcome";
import { day1Email } from "@/lib/email/templates/day1";
import { day2Email } from "@/lib/email/templates/day2";

export async function POST(req: Request) {
  const { email, firstName, template = "welcome" } = await req.json();

  let subject = "Discover Aurora Growth Academy";
  let html = welcomeEmail(firstName);

  if (template === "day1") {
    subject = "How Aurora actually works";
    html = day1Email(firstName);
  }

  if (template === "day2") {
    subject = "Here’s how this works on a real stock";
    html = day2Email(firstName);
  }

  await sendAuroraEmail({
    to: email,
    subject,
    html,
  });

  return NextResponse.json({ success: true });
}
