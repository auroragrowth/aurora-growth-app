import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(stripeSecretKey);

const PLAN_PRICE_MAP: Record<string, string | undefined> = {
  core: process.env.STRIPE_PRICE_CORE_MONTHLY,
  pro: process.env.STRIPE_PRICE_PRO_MONTHLY,
  elite: process.env.STRIPE_PRICE_ELITE_MONTHLY,
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const formData = await request.formData();
    const planKey = String(formData.get("planKey") || "").toLowerCase();

    if (!["core", "pro", "elite"].includes(planKey)) {
      return NextResponse.redirect(
        new URL("/dashboard/upgrade?error=invalid_plan", request.url)
      );
    }

    const priceId = PLAN_PRICE_MAP[planKey];

    if (!priceId) {
      return NextResponse.redirect(
        new URL("/dashboard/upgrade?error=missing_price_id", request.url)
      );
    }

    const siteUrl = "https://app.auroragrowth.co.uk";

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id || null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || profile?.email || undefined,
        name: profile?.full_name || user.user_metadata?.full_name || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });

      customerId = customer.id;

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${siteUrl}/dashboard/account?checkout=success`,
      cancel_url: `${siteUrl}/dashboard/upgrade?checkout=cancelled`,
      metadata: {
        user_id: user.id,
        plan_key: planKey,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_key: planKey,
        },
      },
    });

    if (!session.url) {
      return NextResponse.redirect(
        new URL("/dashboard/upgrade?error=no_checkout_url", request.url)
      );
    }

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (error) {
    console.error("create-checkout error", error);
    return NextResponse.redirect(
      new URL("/dashboard/upgrade?error=server_error", request.url)
    );
  }
}
