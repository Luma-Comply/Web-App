import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

/**
 * Verify a Stripe checkout session and sync subscription status to the DB.
 * Called client-side when a user lands on the dashboard after checkout
 * but the webhook hasn't updated the DB yet (or a race condition overwrote it).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { session_id } = await req.json();
    if (!session_id) {
      return NextResponse.json(
        { error: "Missing session_id" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (
      session.status !== "complete" ||
      session.payment_status !== "paid" ||
      session.metadata?.supabase_user_id !== user.id
    ) {
      return NextResponse.json(
        { error: "Invalid or incomplete session" },
        { status: 400 }
      );
    }

    const subscriptionId = session.subscription as string;
    if (!subscriptionId) {
      return NextResponse.json(
        { error: "No subscription on session" },
        { status: 400 }
      );
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (subscription.status !== "active" && subscription.status !== "trialing") {
      return NextResponse.json(
        { error: "Subscription is not active", status: subscription.status },
        { status: 400 }
      );
    }

    const sub = subscription as any;
    const adminClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const updateData: Record<string, any> = {
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId,
      subscription_status: subscription.status,
      billing_period_start: new Date(
        sub.current_period_start * 1000
      ).toISOString(),
      billing_period_end: new Date(
        sub.current_period_end * 1000
      ).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    };

    if (subscription.status === "active") {
      updateData.trial_ends_at = null;
    }

    const { error } = await adminClient
      .from("users")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      console.error("[verify-session] DB update failed:", error);
      return NextResponse.json(
        { error: "Failed to update subscription" },
        { status: 500 }
      );
    }

    console.log(
      `[verify-session] Synced subscription ${subscriptionId} (${subscription.status}) for user ${user.id}`
    );

    return NextResponse.json({
      status: subscription.status,
      synced: true,
    });
  } catch (error: any) {
    console.error("[verify-session] Error:", error);
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 500 }
    );
  }
}
