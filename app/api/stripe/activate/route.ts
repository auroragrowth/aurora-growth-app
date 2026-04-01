import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    // Verify this session belongs to this user
    if (session.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: "Session mismatch" }, { status: 403 });
    }

    if (session.payment_status !== "paid" && !session.subscription) {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    const planKey = session.metadata?.plan_key || "core";
    const billingInterval = session.metadata?.billing_interval || "monthly";
    const sub = session.subscription as Stripe.Subscription | null;

    const currentPeriodEnd = sub?.items?.data?.[0]?.current_period_end
      ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
      : null;

    // Update profile — this is the fallback when the webhook hasn't fired yet
    await supabaseAdmin
      .from("profiles")
      .update({
        plan_key: planKey,
        plan: planKey,
        billing_interval: billingInterval,
        subscription_status: sub?.status || "active",
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: sub?.id || null,
        current_period_end: currentPeriodEnd,
        subscription_renews_at: currentPeriodEnd,
        has_completed_plan_selection: true,
        last_payment_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    return NextResponse.json({ success: true, planKey });
  } catch (error: unknown) {
    console.error("Activate error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Activation failed",
      },
      { status: 500 }
    );
  }
}
