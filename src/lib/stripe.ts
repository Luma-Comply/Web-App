import { loadStripe } from '@stripe/stripe-js';
import Stripe from 'stripe';

// Client-side Stripe instance
export const getStripe = () => {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
        throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined");
    }
    return loadStripe(key);
};

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});

// Price IDs from environment
export const PRICE_IDS = {
  professional: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL!,
  extraSeat: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_EXTRA_SEAT!,
  extraCases: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_EXTRA_CASES!,
} as const;

// Subscription status helpers
export const isSubscriptionActive = (status: string): boolean => {
  return status === "active" || status === "trialing";
};

export const canCreateCases = (
  status: string,
  trialEndsAt: string | null,
  casesRemaining: number
): boolean => {
  // Check if subscription is active
  if (status === "active") {
    return casesRemaining > 0;
  }

  // Check if trial is active
  if (status === "trialing" && trialEndsAt) {
    const trialEnd = new Date(trialEndsAt);
    const now = new Date();
    const trialActive = trialEnd > now;
    return trialActive && casesRemaining > 0;
  }

  return false;
};

// Format subscription status for display
export const formatSubscriptionStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    trialing: "Free Trial",
    active: "Active",
    canceled: "Canceled",
    past_due: "Payment Failed",
    incomplete: "Incomplete",
    incomplete_expired: "Expired",
    unpaid: "Unpaid",
    paused: "Paused",
  };
  return statusMap[status] || status;
};
