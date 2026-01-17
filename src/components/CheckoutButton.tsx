"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CheckoutButton() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleCheckout = async () => {
        setLoading(true);
        try {
            // Check if user is authenticated
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                // Redirect to signup if not authenticated
                router.push('/signup');
                return;
            }

            // Call the correct checkout endpoint
            const response = await fetch('/api/stripe/create-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    // Unauthorized - redirect to signup
                    router.push('/signup');
                    return;
                }
                throw new Error(data.error || 'Failed to create checkout session');
            }

            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('No checkout URL received');
            }
        } catch (error: any) {
            console.error("Checkout error:", error);
            alert(error.message || "Failed to start checkout. Please try again.");
            setLoading(false);
        }
    };

    return (
        <Button 
            onClick={handleCheckout} 
            disabled={loading} 
            className="h-12 w-full text-lg"
        >
            {loading ? (
                <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Loading...
                </>
            ) : (
                "Get Started"
            )}
        </Button>
    );
}
