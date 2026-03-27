import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendAdminAlert } from "@/lib/telegram/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): string {
  const itemEnd = subscription.items.data[0]?.current_period_end;
  const ts = itemEnd || Math.floor(Date.now() / 1000);
  return new Date(ts * 1000).toISOString();
}

async function activateProfile(
  userId: string,
  planKey: string,
  subscription: Stripe.Subscription
) {
  const currentPeriodEnd = getSubscriptionPeriodEnd(subscription);

  await supabaseAdmin
    .from("profiles")
    .update({
      plan: planKey,
      plan_key: planKey,
      subscription_status: subscription.status,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      current_period_end: currentPeriodEnd,
      has_completed_plan_selection: true,
      onboarding_step: "checkout_complete",
    })
    .eq("id", userId);
}

async function upsertSubscriptionRecord(
  userId: string,
  planKey: string | null,
  subscription: Stripe.Subscription
) {
  const currentPeriodEnd = getSubscriptionPeriodEnd(subscription);
  const billingInterval =
    subscription.items.data[0]?.price.recurring?.interval || "month";

  await supabaseAdmin.from("user_subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      plan_key: planKey,
      billing_interval: billingInterval,
      subscription_status: subscription.status,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
      has_completed_checkout: true,
    },
    { onConflict: "user_id" }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Stripe webhook signature error:", msg);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const planKey = session.metadata?.plan_key;

        if (!userId || !planKey) {
          console.error("Missing metadata in checkout session:", session.id);
          break;
        }

        const subscriptionId = session.subscription as string;
        if (!subscriptionId) {
          console.error("No subscription on checkout session:", session.id);
          break;
        }

        const subscription =
          await stripe.subscriptions.retrieve(subscriptionId);

        await activateProfile(userId, planKey, subscription);
        await upsertSubscriptionRecord(userId, planKey, subscription);
        const customerEmail = session.customer_details?.email || session.customer_email || userId;
        sendAdminAlert(
          `💳 New payment\nPlan: ${planKey}\nEmail: ${customerEmail}`,
          "info"
        );
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        const planKey = subscription.metadata?.plan_key || null;

        if (!userId) break;

        await upsertSubscriptionRecord(userId, planKey, subscription);

        if (planKey) {
          await supabaseAdmin
            .from("profiles")
            .update({
              plan: planKey,
              plan_key: planKey,
              subscription_status: subscription.status,
              current_period_end: getSubscriptionPeriodEnd(subscription),
            })
            .eq("id", userId);
        } else {
          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: subscription.status,
              current_period_end: getSubscriptionPeriodEnd(subscription),
            })
            .eq("id", userId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (!userId) break;

        await supabaseAdmin.from("user_subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            plan_key: null,
            billing_interval: null,
            subscription_status: "canceled",
            current_period_end: null,
            cancel_at_period_end: false,
            has_completed_checkout: false,
          },
          { onConflict: "user_id" }
        );

        await supabaseAdmin
          .from("profiles")
          .update({
            plan: "free",
            plan_key: null,
            subscription_status: "canceled",
            current_period_end: null,
          })
          .eq("id", userId);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subRef =
          invoice.parent?.subscription_details?.subscription ?? null;
        const subscriptionId =
          typeof subRef === "string" ? subRef : subRef?.id ?? null;
        if (!subscriptionId) break;

        const subscription =
          await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.user_id;
        if (!userId) break;

        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: subscription.status,
            current_period_end: getSubscriptionPeriodEnd(subscription),
          })
          .eq("id", userId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subRef =
          invoice.parent?.subscription_details?.subscription ?? null;
        const subscriptionId =
          typeof subRef === "string" ? subRef : subRef?.id ?? null;
        if (!subscriptionId) break;

        const subscription =
          await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.user_id;
        if (!userId) break;

        await supabaseAdmin
          .from("profiles")
          .update({ subscription_status: "past_due" })
          .eq("id", userId);
        sendAdminAlert(
          `❌ Payment failed\nUser: ${userId}\nInvoice: ${invoice.id}`,
          "error"
        );
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
