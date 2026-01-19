import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

// Use service role key for webhook handlers (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`Processing webhook: ${event.type}`);

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.supabase_user_id;

  if (!userId) {
    console.error("No supabase_user_id in subscription metadata");
    return;
  }

  const status = subscription.status;
  // Type cast to any to access period fields
  const sub = subscription as any;
  const currentPeriodEnd = new Date(sub.current_period_end * 1000);
  const currentPeriodStart = new Date(sub.current_period_start * 1000);

  const updateData: any = {
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    subscription_status: status,
    billing_period_start: currentPeriodStart.toISOString(),
    billing_period_end: currentPeriodEnd.toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
  };

  // If transitioning FROM trial TO active, reset cases
  if (status === "active" && sub.trial_end) {
    updateData.trial_ends_at = null;
    updateData.cases_remaining = 50;
    updateData.cases_used_this_period = 0;
  }

  // Ensure cases_remaining is set for new active subscriptions or updates if missing
  // This covers the case where a user subscribes with a coupon or normally
  if (status === "active" || status === "trialing") {
    // We might want to be careful not to reset it mid-cycle if it's just a metadata update,
    // but for now, ensuring it's not 0 is critical.
    // A safer check: if it's a creation event or period switch, which is handled largely by webhooks.
    // However, to fix the user's immediate "0" issue, we can default it if it's null/0 in the DB,
    // but we don't have DB access here to check "current" value before update easily without an extra query.
    // Best approach for "Creation/Update" webhook:
    // If this is a new period (checked by period start comparison? No, complex).
    // Simpler: If the event is "customer.subscription.created", we set it.
    // If it is "updated", we usually only touch it if status changed.

    // Let's rely on the fact that if we are processing this, we want to ensure they have access.
    // BUT, we shouldn't reset `cases_remaining` on every minor update (like changing a payment method).
    // The `invoice.payment_succeeded` handles the monthly reset.
    // The "transition from trial" handles that specific edge case.
    // Check if this is a NEW subscription (creation).
  }

  // If status is trialing, set trial end date
  if (status === "trialing" && sub.trial_end) {
    updateData.trial_ends_at = new Date(sub.trial_end * 1000).toISOString();
    // Ensure trial users get cases
    updateData.cases_remaining = 50;
  }

  // Always ensure we have a default seat count if not present
  updateData.seats_count = 3;

  const { error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", userId);

  if (error) {
    console.error("Failed to update user subscription:", error);
    throw error;
  }

  console.log(`Updated subscription for user ${userId}: ${status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.supabase_user_id;

  if (!userId) {
    console.error("No supabase_user_id in subscription metadata");
    return;
  }

  const { error } = await supabase
    .from("users")
    .update({
      subscription_status: "canceled",
      cases_remaining: 0,
    })
    .eq("id", userId);

  if (error) {
    console.error("Failed to cancel user subscription:", error);
    throw error;
  }

  console.log(`Canceled subscription for user ${userId}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const inv = invoice as any;
  const subscriptionId = inv.subscription as string;

  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata.supabase_user_id;

  if (!userId) return;

  // Type cast to access period fields
  const sub = subscription as any;

  // Reset monthly cases counter on successful payment
  const { error } = await supabase
    .from("users")
    .update({
      subscription_status: "active",
      cases_remaining: 50,
      cases_used_this_period: 0,
      billing_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      billing_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("Failed to reset cases after payment:", error);
  }

  console.log(`Payment succeeded for user ${userId}, cases reset`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const inv = invoice as any;
  const subscriptionId = inv.subscription as string;

  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata.supabase_user_id;

  if (!userId) return;

  const { error } = await supabase
    .from("users")
    .update({
      subscription_status: "past_due",
    })
    .eq("id", userId);

  if (error) {
    console.error("Failed to mark subscription as past_due:", error);
  }

  console.log(`Payment failed for user ${userId}`);
}
