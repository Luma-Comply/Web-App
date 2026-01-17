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

  // If status is trialing, set trial end date
  if (status === "trialing" && sub.trial_end) {
    updateData.trial_ends_at = new Date(sub.trial_end * 1000).toISOString();
  }

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
