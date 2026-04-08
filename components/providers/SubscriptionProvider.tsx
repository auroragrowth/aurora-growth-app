"use client";

import { createContext, useContext, type ReactNode } from "react";

type SubscriptionState = {
  planKey: string;
  planName: string;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  isExpired: boolean;
  isPastDue: boolean;
  isActive: boolean;
};

const SubscriptionContext = createContext<SubscriptionState>({
  planKey: "core",
  planName: "Aurora Core",
  subscriptionStatus: null,
  currentPeriodEnd: null,
  isExpired: false,
  isPastDue: false,
  isActive: false,
});

export function SubscriptionProvider({
  children,
  planKey,
  planName,
  subscriptionStatus,
  currentPeriodEnd,
}: {
  children: ReactNode;
  planKey: string;
  planName: string;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
}) {
  const isPaidPlan = ["core", "pro", "elite"].includes(planKey);
  const periodEndDate = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
  const isExpiredByDate = periodEndDate ? periodEndDate.getTime() < Date.now() : false;

  const isExpired =
    isPaidPlan &&
    subscriptionStatus === "canceled" &&
    isExpiredByDate;

  const isPastDue = subscriptionStatus === "past_due";

  const isActive =
    subscriptionStatus === "active" ||
    subscriptionStatus === "trialing" ||
    (isPaidPlan && !isExpired && !isPastDue);

  return (
    <SubscriptionContext.Provider
      value={{
        planKey,
        planName,
        subscriptionStatus,
        currentPeriodEnd,
        isExpired,
        isPastDue,
        isActive,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
