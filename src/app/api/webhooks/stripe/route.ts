import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

type SupabaseClientType = SupabaseClient<any, "public", any>;

// Validate environment variables at startup
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Health check endpoint - allows testing if route is reachable
export async function GET() {
  const hasSupabaseUrl = !!SUPABASE_URL;
  const hasSupabaseKey = !!SUPABASE_SERVICE_ROLE_KEY;
  const hasStripeSecret = !!STRIPE_WEBHOOK_SECRET;

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    config: {
      supabaseUrl: hasSupabaseUrl,
      supabaseKey: hasSupabaseKey,
      stripeSecret: hasStripeSecret,
      stripeSecretPrefix: hasStripeSecret ? STRIPE_WEBHOOK_SECRET!.substring(0, 10) + "..." : null,
    },
  });
}

export async function POST(req: NextRequest) {
  console.log("Webhook POST received", {
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Check environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase environment variables", {
      hasUrl: !!SUPABASE_URL,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
    });
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("Missing STRIPE_WEBHOOK_SECRET environment variable");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Create Supabase client per request to ensure fresh connection
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("No Stripe signature in request headers");
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", {
      error: errorMessage,
      signaturePrefix: signature.substring(0, 20) + "...",
      bodyLength: body.length,
      secretPrefix: STRIPE_WEBHOOK_SECRET.substring(0, 10) + "...",
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`Processing webhook: ${event.type}`, { eventId: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, supabase);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription, supabase);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, supabase);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice, supabase);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice, supabase);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Webhook handler error:", {
      message: errorMessage,
      stack: errorStack,
      eventType: event.type,
      eventId: event.id,
    });
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: SupabaseClientType
) {
  const userId = session.metadata?.supabase_user_id;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error("No supabase_user_id in checkout session metadata", {
      sessionId: session.id,
    });
    return;
  }

  console.log("Processing checkout.session.completed", {
    userId,
    customerId,
    subscriptionId,
    sessionId: session.id,
  });

  // Fetch subscription from Stripe to get accurate status and billing period
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const sub = subscription as any;
  const status = subscription.status;

  const updateData: Record<string, any> = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    subscription_status: status,
    billing_period_start: new Date(sub.current_period_start * 1000).toISOString(),
    billing_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
  };

  // Clear trial date if active (no trial)
  if (status === "active") {
    updateData.trial_ends_at = null;
  }

  // Set trial date if trialing
  if (status === "trialing" && sub.trial_end) {
    updateData.trial_ends_at = new Date(sub.trial_end * 1000).toISOString();
  }

  const { error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", userId);

  if (error) {
    console.error("Failed to update user after checkout:", error);
    throw error;
  }

  console.log(`Checkout completed for user ${userId}, status: ${status}`);
}

async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  supabase: SupabaseClientType
) {
  let userId = subscription.metadata.supabase_user_id;
  const customerId = subscription.customer as string;

  // First, verify the user exists in our database
  let userExists = false;

  if (userId) {
    const { data: userById } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();
    userExists = !!userById;
  }

  // If user not found by ID, try by customer ID
  if (!userExists) {
    console.warn("User not found by ID, attempting customer lookup", {
      subscriptionId: subscription.id,
      userId,
      customerId,
    });

    const { data: userByCustomer } = await supabase
      .from("users")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (userByCustomer) {
      userId = userByCustomer.id;
      userExists = true;
    }
  }

  // If still no user found, log and return gracefully (don't throw error)
  if (!userExists || !userId) {
    console.warn("User not found in database, skipping subscription update", {
      subscriptionId: subscription.id,
      customerId,
      metadataUserId: subscription.metadata.supabase_user_id,
    });
    return;
  }

  const status = subscription.status;
  // Type cast to any to access period fields
  const sub = subscription as any;
  const currentPeriodEnd = new Date(sub.current_period_end * 1000);
  const currentPeriodStart = new Date(sub.current_period_start * 1000);

  const updateData: Record<string, any> = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    subscription_status: status,
    billing_period_start: currentPeriodStart.toISOString(),
    billing_period_end: currentPeriodEnd.toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
  };

  // If transitioning FROM trial TO active, clear trial date
  if (status === "active" && sub.trial_end) {
    updateData.trial_ends_at = null;
  }

  // If status is trialing, set trial end date
  if (status === "trialing" && sub.trial_end) {
    updateData.trial_ends_at = new Date(sub.trial_end * 1000).toISOString();
  }

  // Calculate seats_count from all active subscriptions
  // Base plan includes 3 seats, extra seat subscriptions add more
  const extraSeatPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_EXTRA_SEAT;
  let extraSeats = 0;

  if (extraSeatPriceId) {
    // Check items on this subscription
    if (subscription.items?.data) {
      for (const item of subscription.items.data) {
        if (item.price?.id === extraSeatPriceId) {
          extraSeats += item.quantity || 0;
        }
      }
    }

    // Also check other active subscriptions (extra seats may be separate)
    if (extraSeats === 0) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
        });
        for (const sub of subscriptions.data) {
          for (const item of sub.items.data) {
            if (item.price?.id === extraSeatPriceId) {
              extraSeats += item.quantity || 0;
            }
          }
        }
      } catch (e) {
        console.warn("Failed to list subscriptions for seat count:", e);
      }
    }
  }

  updateData.seats_count = 3 + extraSeats;
  console.log(`Seats: 3 base + ${extraSeats} extra = ${3 + extraSeats}`);

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

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: SupabaseClientType
) {
  let userId = subscription.metadata.supabase_user_id;
  const customerId = subscription.customer as string;

  // First, verify the user exists in our database
  let userExists = false;

  if (userId) {
    const { data: userById } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();
    userExists = !!userById;
  }

  // If user not found by ID, try by customer ID
  if (!userExists) {
    const { data: userByCustomer } = await supabase
      .from("users")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (userByCustomer) {
      userId = userByCustomer.id;
      userExists = true;
    }
  }

  // If still no user found, log and return gracefully
  if (!userExists || !userId) {
    console.warn("User not found in database, skipping subscription deletion", {
      subscriptionId: subscription.id,
      customerId,
      metadataUserId: subscription.metadata.supabase_user_id,
    });
    return;
  }

  const { error } = await supabase
    .from("users")
    .update({
      subscription_status: "canceled",
      cancel_at_period_end: false,
    })
    .eq("id", userId);

  if (error) {
    console.error("Failed to cancel user subscription:", error);
    throw error;
  }

  console.log(`Canceled subscription for user ${userId}`);
}

async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: SupabaseClientType
) {
  const inv = invoice as any;
  const subscriptionId = inv.subscription as string;

  if (!subscriptionId) {
    console.log("Invoice has no subscription, skipping", { invoiceId: invoice.id });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  let userId = subscription.metadata.supabase_user_id;
  const customerId = subscription.customer as string;

  // First, verify the user exists in our database
  let userExists = false;

  if (userId) {
    const { data: userById } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();
    userExists = !!userById;
  }

  // If user not found by ID, try by customer ID
  if (!userExists) {
    const { data: userByCustomer } = await supabase
      .from("users")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (userByCustomer) {
      userId = userByCustomer.id;
      userExists = true;
    }
  }

  // If still no user found, log and return gracefully
  if (!userExists || !userId) {
    console.warn("User not found in database, skipping payment success", {
      subscriptionId,
      customerId,
      invoiceId: invoice.id,
    });
    return;
  }

  // Type cast to access period fields
  const sub = subscription as any;

  // Update subscription status on successful payment using actual Stripe status
  const { error } = await supabase
    .from("users")
    .update({
      subscription_status: subscription.status,
      billing_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      billing_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("Failed to reset cases after payment:", error);
    throw error;
  }

  console.log(`Payment succeeded for user ${userId}, cases reset`);
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: SupabaseClientType
) {
  const inv = invoice as any;
  const subscriptionId = inv.subscription as string;

  if (!subscriptionId) {
    console.log("Invoice has no subscription, skipping payment failure", {
      invoiceId: invoice.id,
    });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  let userId = subscription.metadata.supabase_user_id;
  const customerId = subscription.customer as string;

  // First, verify the user exists in our database
  let userExists = false;

  if (userId) {
    const { data: userById } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();
    userExists = !!userById;
  }

  // If user not found by ID, try by customer ID
  if (!userExists) {
    const { data: userByCustomer } = await supabase
      .from("users")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (userByCustomer) {
      userId = userByCustomer.id;
      userExists = true;
    }
  }

  // If still no user found, log and return gracefully
  if (!userExists || !userId) {
    console.warn("User not found in database, skipping payment failure", {
      subscriptionId,
      customerId,
      invoiceId: invoice.id,
    });
    return;
  }

  const { error } = await supabase
    .from("users")
    .update({
      subscription_status: "past_due",
    })
    .eq("id", userId);

  if (error) {
    console.error("Failed to mark subscription as past_due:", error);
    throw error;
  }

  console.log(`Payment failed for user ${userId}`);
}
