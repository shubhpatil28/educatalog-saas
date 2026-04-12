/**
 * useRazorpay
 * Loads the Razorpay checkout script on demand and exposes an `openCheckout`
 * function that creates an order, launches the popup, and verifies payment.
 */

import { useCallback } from 'react';

declare global {
    interface Window {
        Razorpay: any;
    }
}

function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
        if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

export interface RazorpayCheckoutOptions {
    schoolId: string;
    schoolName: string;
    plan: 'basic' | 'premium';
    email: string;
    onSuccess: (expiryDate: string) => void;
    onFailure: (error: string) => void;
}

export function useRazorpay() {
    const openCheckout = useCallback(async (opts: RazorpayCheckoutOptions) => {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
            opts.onFailure('Failed to load Razorpay. Please check your connection.');
            return;
        }

        // 1. Create order on server
        const orderRes = await fetch('/api/razorpay/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: opts.plan, schoolId: opts.schoolId }),
        });

        if (!orderRes.ok) {
            const err = await orderRes.json();
            opts.onFailure(err.error || 'Could not create payment order.');
            return;
        }

        const { orderId, amount, currency, keyId } = await orderRes.json();

        // 2. Open Razorpay popup
        const rzp = new window.Razorpay({
            key: keyId,
            amount,
            currency,
            name: 'EduCatalog',
            description: `${opts.plan.charAt(0).toUpperCase() + opts.plan.slice(1)} Plan – Annual Subscription`,
            order_id: orderId,
            prefill: { email: opts.email },
            theme: { color: '#2563EB' },
            handler: async (response: {
                razorpay_payment_id: string;
                razorpay_order_id: string;
                razorpay_signature: string;
            }) => {
                // 3. Verify on server & update Firestore
                const verifyRes = await fetch('/api/razorpay/verify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        schoolId: opts.schoolId,
                        plan: opts.plan,
                    }),
                });

                const verifyData = await verifyRes.json();
                if (verifyRes.ok && verifyData.success) {
                    opts.onSuccess(verifyData.expiryDate);
                } else {
                    opts.onFailure(verifyData.error || 'Payment verification failed.');
                }
            },
            modal: {
                ondismiss: () => {
                    opts.onFailure('Payment was cancelled.');
                },
            },
        });

        rzp.open();
    }, []);

    return { openCheckout };
}
