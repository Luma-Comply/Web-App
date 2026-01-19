import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Use getUser() instead of getSession() for security
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error("[Checkout] Auth error:", authError);
      return NextResponse.json({ error: "Authentication error" }, { status: 401 });
    }

    if (!authUser) {
      console.error("[Checkout] No authenticated user");
      return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 });
    }

    // Get user data from database using service role to bypass RLS
    // We've already verified auth above, so it's safe to use service role here
    console.log('[Checkout] Looking for user:', authUser.id, authUser.email);
    const adminClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Retry mechanism: Sometimes the trigger hasn't created the public.users record yet
    // when a user signs up and immediately goes to checkout
    let user = null;
    let userError = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const { data, error } = await adminClient
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (data) {
        user = data;
        break;
      }

      userError = error;

      if (attempt < maxRetries) {
        console.log(`[Checkout] User not found on attempt ${attempt}, retrying in 500ms...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (userError || !user) {
      console.error('[Checkout] User not found after retries:', { userId: authUser.id, email: authUser.email, error: userError });
      return NextResponse.json({
        error: "User not found",
        details: `User ID: ${authUser.id}, Email: ${authUser.email}`,
        dbError: userError?.message
      }, { status: 404 });
    }

    console.log('[Checkout] User found:', user.email);

    // Check if user already has a Stripe customer ID
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: authUser.email,
        metadata: {
          supabase_user_id: authUser.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to database using admin client
      await adminClient
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", authUser.id);
    }

    // Create Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL!,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          supabase_user_id: authUser.id,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
