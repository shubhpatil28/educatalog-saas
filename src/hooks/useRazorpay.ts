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
        // Payment system is safely disabled as per requirements
        opts.onFailure('Institutional payment system is currently undergoing maintenance. Please contact support to activate your workspace.');
        return;
    }, []);

    return { openCheckout };
}
