
"use client";

import { Button } from "@/components/ui/button";
import { getStripe } from "@/lib/stripe";
import { useState } from "react";

export default function CheckoutButton() {
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL,
                }),
            });

            const { url } = await response.json();
            if (url) {
                window.location.href = url;
            } else {
                console.error("No checkout URL returned");
            }
        } catch (error) {
            console.error("Checkout error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button onClick={handleCheckout} disabled={loading} className="h-12 w-full text-lg">
            {loading ? "Loading..." : "Get Started"}
        </Button>
    );
}
