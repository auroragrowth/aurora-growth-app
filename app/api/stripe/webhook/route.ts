import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendAdminAlert } from "@/lib/telegram/admin";
import { sendSubscriptionConfirmedTrigger } from "@/lib/email/triggers";

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

function getInvoiceAmount(invoice: Stripe.Invoice): number {
  return invoice.amount_paid ?? 0;
}

function getInvoiceCurrency(invoice: Stripe.Invoice): string {
  return invoice.currency ?? "gbp";
}

async function logSubscriptionEvent(event: {
  user_id: string;
  event_type: string;
  plan_key?: string | null;
  amount_paid?: number;
  currency?: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_invoice_id?: string | null;
  period_end?: string | null;
  raw_event_id?: string;
}) {
  await supabaseAdmin.from("subscription_events").insert(event);
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

async function getSubscriptionFromInvoice(
  invoice: Stripe.Invoice
): Promise<{ subscriptionId: string; subscription: Stripe.Subscription } | null> {
  const subRef =
    invoice.parent?.subscription_details?.subscription ?? null;
  const subscriptionId =
    typeof subRef === "string" ? subRef : subRef?.id ?? null;
  if (!subscriptionId) return null;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return { subscriptionId, subscription };
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
      // ── Checkout completed ─────────────────────────────────
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
        const currentPeriodEnd = getSubscriptionPeriodEnd(subscription);
        const amountPaid = (session.amount_total ?? 0);

        // Update profiles with full subscription data
        await supabaseAdmin
          .from("profiles")
          .update({
            plan: planKey,
            plan_key: planKey,
            subscription_status: "active",
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            current_period_end: currentPeriodEnd,
            subscription_renews_at: currentPeriodEnd,
            last_payment_at: new Date().toISOString(),
            last_payment_amount: amountPaid,
            has_completed_plan_selection: true,
            onboarding_step: "checkout_complete",
          })
          .eq("id", userId);

        // Increment counters via RPC or separate update
        await supabaseAdmin.rpc("increment_payment_stats", {
          p_user_id: userId,
          p_amount: amountPaid,
        }).then(r => {
          // If RPC doesn't exist, silently ignore
          if (r.error) console.log("increment_payment_stats not available:", r.error.message);
        });

        await upsertSubscriptionRecord(userId, planKey, subscription);

        const customerEmail =
          session.customer_details?.email ||
          session.customer_email ||
          userId;

        await logSubscriptionEvent({
          user_id: userId,
          event_type: "checkout_completed",
          plan_key: planKey,
          amount_paid: amountPaid,
          currency: (session.currency ?? "gbp"),
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          period_end: currentPeriodEnd,
          raw_event_id: event.id,
        });

        sendAdminAlert(
          `💳 New payment\nPlan: ${planKey}\nEmail: ${customerEmail}\nAmount: ${(amountPaid / 100).toFixed(2)} ${session.currency?.toUpperCase() ?? "GBP"}`,
          "info"
        );
        break;
      }

      // ── Subscription created/updated ───────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        const planKey = subscription.metadata?.plan_key || null;

        if (!userId) break;

        const currentPeriodEnd = getSubscriptionPeriodEnd(subscription);

        await upsertSubscriptionRecord(userId, planKey, subscription);

        const profileUpdate: Record<string, unknown> = {
          subscription_status: subscription.status,
          current_period_end: currentPeriodEnd,
          subscription_renews_at: currentPeriodEnd,
        };

        if (planKey) {
          profileUpdate.plan = planKey;
          profileUpdate.plan_key = planKey;
        }

        await supabaseAdmin
          .from("profiles")
          .update(profileUpdate)
          .eq("id", userId);

        await logSubscriptionEvent({
          user_id: userId,
          event_type: "subscription_updated",
          plan_key: planKey,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          period_end: currentPeriodEnd,
          raw_event_id: event.id,
        });

        // Send plan activation email on new active subscriptions
        if (subscription.status === "active" && event.type === "customer.subscription.created") {
          try {
            const { data: profile } = await supabaseAdmin
              .from("profiles")
              .select("full_name, email")
              .eq("id", userId)
              .single();
            const email = profile?.email;
            const rawName = profile?.full_name?.split(" ")[0] || "there";
            const name = rawName.trim().replace(/,+$/, '').trim();
            const plan = planKey === "elite" ? "Elite" : planKey === "pro" ? "Pro" : planKey === "core" ? "Core" : "Growth";
            if (email) {
              await sendSubscriptionConfirmedTrigger(email, name, plan);
            }
          } catch (e) {
            console.error("Failed to send subscription email:", e);
          }
        }
        break;
      }

      // ── Subscription deleted/cancelled ─────────────────────
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
            subscription_renews_at: null,
            subscription_cancelled_at: new Date().toISOString(),
          })
          .eq("id", userId);

        await logSubscriptionEvent({
          user_id: userId,
          event_type: "subscription_cancelled",
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          raw_event_id: event.id,
        });

        sendAdminAlert(
          `🚫 Subscription cancelled\nUser: ${userId}`,
          "warning"
        );
        break;
      }

      // ── Invoice payment succeeded (renewal) ────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const result = await getSubscriptionFromInvoice(invoice);
        if (!result) break;

        const { subscription } = result;
        const userId = subscription.metadata?.user_id;
        if (!userId) break;

        const currentPeriodEnd = getSubscriptionPeriodEnd(subscription);
        const amountPaid = getInvoiceAmount(invoice);

        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "active",
            current_period_end: currentPeriodEnd,
            subscription_renews_at: currentPeriodEnd,
            last_payment_at: new Date().toISOString(),
            last_payment_amount: amountPaid,
          })
          .eq("id", userId);

        await supabaseAdmin.rpc("increment_payment_stats", {
          p_user_id: userId,
          p_amount: amountPaid,
        }).then(r => {
          if (r.error) console.log("increment_payment_stats not available:", r.error.message);
        });

        await logSubscriptionEvent({
          user_id: userId,
          event_type: "payment_succeeded",
          plan_key: subscription.metadata?.plan_key ?? null,
          amount_paid: amountPaid,
          currency: getInvoiceCurrency(invoice),
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          stripe_invoice_id: invoice.id,
          period_end: currentPeriodEnd,
          raw_event_id: event.id,
        });
        break;
      }

      // ── Invoice payment failed ─────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const result = await getSubscriptionFromInvoice(invoice);
        if (!result) break;

        const { subscription } = result;
        const userId = subscription.metadata?.user_id;
        if (!userId) break;

        await supabaseAdmin
          .from("profiles")
          .update({ subscription_status: "past_due" })
          .eq("id", userId);

        await logSubscriptionEvent({
          user_id: userId,
          event_type: "payment_failed",
          plan_key: subscription.metadata?.plan_key ?? null,
          amount_paid: getInvoiceAmount(invoice),
          currency: getInvoiceCurrency(invoice),
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          stripe_invoice_id: invoice.id,
          raw_event_id: event.id,
        });

        sendAdminAlert(
          `❌ Payment failed\nUser: ${userId}\nInvoice: ${invoice.id}\nAmount: ${((invoice.amount_due ?? 0) / 100).toFixed(2)} ${invoice.currency?.toUpperCase() ?? "GBP"}`,
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
