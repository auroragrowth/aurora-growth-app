import { NextRequest, NextResponse } from "next/server";
import {
  getStripePriceId,
  type BillingInterval,
  type PlanKey,
} from "@/lib/billing/plans";
import { stripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const planKey = body.planKey as PlanKey;
    const billingInterval = body.billingInterval as BillingInterval;

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

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Supabase auth error:", userError);
      return NextResponse.json(
        { error: "Unable to read user session" },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    const priceId = getStripePriceId(planKey, billingInterval);

    if (!priceId) {
      return NextResponse.json(
        { error: `No Stripe price ID found for ${planKey} ${billingInterval}` },
        { status: 400 }
      );
    }

    await supabase
      .from("profiles")
      .update({
        has_completed_plan_selection: true,
        plan_key: planKey,
        billing_interval: billingInterval,
        plan: planKey,
      })
      .eq("id", user.id);

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      "https://app.auroragrowth.co.uk";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      ...(profile?.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
      success_url: `${appUrl}/dashboard/account?checkout=success`,
      cancel_url: `${appUrl}/dashboard/upgrade?checkout=cancelled`,
      metadata: {
        user_id: user.id,
        plan_key: planKey,
        billing_interval: billingInterval,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_key: planKey,
          billing_interval: billingInterval,
        },
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
  } catch (error: any) {
    console.error("Stripe checkout error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Something went wrong creating checkout",
      },
      { status: 500 }
    );
  }
}
