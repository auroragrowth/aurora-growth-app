import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe signature" }, { status: 400 });
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
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.user_id;
      const planKey = session.metadata?.plan_key;

      if (!userId || !planKey) {
        console.error("Missing metadata in checkout session");
        return NextResponse.json({ received: true });
      }

      const subscriptionId = session.subscription as string;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      const billingInterval =
        subscription.items.data[0]?.price.recurring?.interval || "month";

      const currentPeriodEnd = new Date(
        subscription.items.data[0]?.current_period_end
          ? subscription.items.data[0].current_period_end * 1000
          : Date.now()
      ).toISOString();

      // Update profiles: activate plan and trigger the Trading 212 setup popup
      await supabaseAdmin
        .from("profiles")
        .update({
          plan: planKey,
          subscription_status: subscription.status,
          onboarding_step: "checkout_complete",
        })
        .eq("id", userId);

      await supabaseAdmin
        .from("user_subscriptions")
        .upsert(
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

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;
      const planKey = subscription.metadata?.plan_key;

      if (userId) {
        const billingInterval =
          subscription.items.data[0]?.price.recurring?.interval || "month";

        const currentPeriodEnd = new Date(
          subscription.items.data[0]?.current_period_end
            ? subscription.items.data[0].current_period_end * 1000
            : Date.now()
        ).toISOString();

        await supabaseAdmin
          .from("user_subscriptions")
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: subscription.customer as string,
              stripe_subscription_id: subscription.id,
              plan_key: planKey || null,
              billing_interval: billingInterval,
              subscription_status: subscription.status,
              current_period_end: currentPeriodEnd,
              cancel_at_period_end: subscription.cancel_at_period_end,
              has_completed_checkout: true,
            },
            { onConflict: "user_id" }
          );

        if (planKey) {
          await supabaseAdmin
            .from("profiles")
            .update({ plan: planKey, subscription_status: subscription.status })
            .eq("id", userId);
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;

      if (userId) {
        await supabaseAdmin
          .from("user_subscriptions")
          .upsert(
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
          .update({ plan: "free", subscription_status: "canceled" })
          .eq("id", userId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
