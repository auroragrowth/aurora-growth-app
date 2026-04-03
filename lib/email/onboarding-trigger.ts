import { sendOnboardingDay } from "@/lib/email/onboarding";

export async function triggerInstantWelcome(params: {
  userId: string;
  email: string;
  firstName: string;
}) {
  return sendOnboardingDay(
    params.userId,
    0,
    params.firstName || "Investor",
    params.email,
  );
}
