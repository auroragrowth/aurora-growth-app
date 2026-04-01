import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { planKey, billingInterval } = await req.json();

    if (!planKey || !billingInterval) {
      return NextResponse.json(
        { error: "Missing planKey or billingInterval" },
        { status: 400 }
      );
    }

    if (!["core", "pro", "elite"].includes(planKey)) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    if (!["monthly", "yearly"].includes(billingInterval)) {
      return NextResponse.json(
        { error: "Invalid billing interval" },
        { status: 400 }
      );
    }

    // Get price from DATABASE only - never from env vars or Stripe API
    const { data: plan, error: planError } = await supabaseAdmin
      .from("stripe_plans")
      .select("*")
      .eq("plan_key", planKey)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      console.error("stripe_plans lookup failed:", planError);
      return NextResponse.json(
        { error: `No active plan found for ${planKey}` },
        { status: 400 }
      );
    }

    const priceId =
      billingInterval === "yearly"
        ? plan.stripe_price_id_yearly
        : plan.stripe_price_id_monthly;

    if (!priceId) {
      return NextResponse.json(
        { error: `No Stripe price ID found for ${planKey} ${billingInterval}` },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email, full_name")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email!,
        name: profile?.full_name || undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // Record plan selection intent
    await supabaseAdmin
      .from("profiles")
      .update({
        has_completed_plan_selection: true,
        plan_key: planKey,
        billing_interval: billingInterval,
        plan: planKey,
      })
      .eq("id", user.id);

    const siteUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      "https://app.auroragrowth.co.uk";

    // Create checkout session - price ID from DB, no Stripe price lookups
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: {
        ...(planKey === "core" ? { trial_period_days: 7 } : {}),
        metadata: {
          user_id: user.id,
          plan_key: planKey,
          billing_interval: billingInterval,
        },
      },
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/select-plan`,
      metadata: {
        user_id: user.id,
        plan_key: planKey,
        billing_interval: billingInterval,
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe returned no checkout URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Something went wrong creating checkout",
      },
      { status: 500 }
    );
  }
}
