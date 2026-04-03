import { sendAuroraEmail } from "@/lib/email/resend";
import {
  welcomeEmail,
  subscriptionConfirmedEmail,
  paymentFailedEmail,
  opportunityDetectedEmail,
  pullbackAlertEmail,
  bepReachedEmail,
  profitTargetEmail,
} from "@/lib/email/templates/aurora";

export async function sendWelcomeTrigger(email: string, firstName: string) {
  return sendAuroraEmail({
    to: email,
    subject: "Welcome to Aurora Growth Academy",
    html: welcomeEmail(firstName),
  });
}

export async function sendSubscriptionConfirmedTrigger(
  email: string,
  firstName: string,
  planName: string
) {
  return sendAuroraEmail({
    to: email,
    subject: "Your Aurora plan is now live",
    html: subscriptionConfirmedEmail(firstName, planName),
  });
}

export async function sendPaymentFailedTrigger(email: string, firstName: string) {
  return sendAuroraEmail({
    to: email,
    subject: "There was a problem with your payment",
    html: paymentFailedEmail(firstName),
  });
}

export async function sendOpportunityDetectedTrigger(
  email: string,
  firstName: string,
  ticker: string
) {
  return sendAuroraEmail({
    to: email,
    subject: `Opportunity detected: ${ticker}`,
    html: opportunityDetectedEmail(firstName, ticker),
  });
}

export async function sendPullbackAlertTrigger(
  email: string,
  firstName: string,
  ticker: string,
  level: string
) {
  return sendAuroraEmail({
    to: email,
    subject: `Pullback alert: ${ticker}`,
    html: pullbackAlertEmail(firstName, ticker, level),
  });
}

export async function sendBepReachedTrigger(
  email: string,
  firstName: string,
  ticker: string
) {
  return sendAuroraEmail({
    to: email,
    subject: `BEP reached: ${ticker}`,
    html: bepReachedEmail(firstName, ticker),
  });
}

export async function sendProfitTargetTrigger(
  email: string,
  firstName: string,
  ticker: string,
  target: string
) {
  return sendAuroraEmail({
    to: email,
    subject: `Profit target hit: ${ticker}`,
    html: profitTargetEmail(firstName, ticker, target),
  });
}
