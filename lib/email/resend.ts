import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendAuroraEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  return await resend.emails.send({
    from: "Aurora Growth <onboarding@auroragrowth.co.uk>",
    to,
    subject,
    html,
  });
}
