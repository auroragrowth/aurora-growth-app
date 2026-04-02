import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  throw new Error("RESEND_API_KEY is not set");
}

export const resend = new Resend(resendApiKey);

type SendAuroraTemplateEmailArgs = {
  to: string | string[];
  subject: string;
  firstName: string;
};

export async function sendAuroraTemplateEmail({
  to,
  subject,
  firstName,
}: SendAuroraTemplateEmailArgs) {
  return await resend.emails.send({
    from: "Aurora Growth <info@auroragrowth.co.uk>",
    to,
    subject,
    template: {
      id: "YOUR_RESEND_TEMPLATE_ID",
      variables: {
        firstName,
      },
    },
  });
}
