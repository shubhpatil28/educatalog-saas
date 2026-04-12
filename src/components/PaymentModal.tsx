"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/components/ui';
import { useRazorpay } from '@/hooks/useRazorpay';
import {
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Sparkles,
    Shield,
    CreditCard,
    Zap,
} from 'lucide-react';

interface Plan {
    id: 'basic' | 'premium';
    name: string;
    price: number;
    displayPrice: string;
    features: string[];
    color: string;
    gradient: string;
    badge?: string;
}

const PLANS: Plan[] = [
    {
        id: 'basic',
        name: 'Basic',
        price: 2000,
        displayPrice: '₹2,000',
        features: [
            'Up to 200 students',
            'Attendance tracking',
            'Basic analytics & reports',
            'PDF & Excel export',
            '1 Principal account',
            '30-day email support',
        ],
        color: 'text-slate-700',
        gradient: 'from-slate-600 to-slate-800',
    },
    {
        id: 'premium',
        name: 'Premium',
        price: 5000,
        displayPrice: '₹5,000',
        badge: 'Most Popular',
        features: [
            'Unlimited students',
            'Advanced analytics dashboard',
            'QR Code attendance',
            'Teacher management',
            'Student profile PDFs',
            'Priority 24/7 support',
            'Custom school branding',
        ],
        color: 'text-indigo-600',
        gradient: 'from-blue-600 to-indigo-700',
    },
];

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    schoolId: string;
    schoolName: string;
    email: string;
    currentPlan?: string;
    onPaymentSuccess: (plan: string, expiryDate: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    schoolId,
    schoolName,
    email,
    currentPlan,
    onPaymentSuccess,
}) => {
    const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium'>('premium');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const { openCheckout } = useRazorpay();

    const handlePay = async () => {
        setStatus('loading');
        setMessage('');

        await openCheckout({
            schoolId,
            schoolName,
            plan: selectedPlan,
            email,
            onSuccess: (expiryDate) => {
                setStatus('success');
                setMessage(expiryDate);
                onPaymentSuccess(selectedPlan, expiryDate);
            },
            onFailure: (error) => {
                if (error === 'Payment was cancelled.') {
                    setStatus('idle');
                } else {
                    setStatus('error');
                    setMessage(error);
                }
            },
        });
    };

    const handleClose = () => {
        if (status === 'loading') return;
        setStatus('idle');
        setMessage('');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl pointer-events-auto overflow-hidden">

                            {/* Header */}
                            <div className="relative p-8 pb-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                                <button
                                    onClick={handleClose}
                                    disabled={status === 'loading'}
                                    title="Close"
                                    aria-label="Close payment modal"
                                    className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2.5 bg-white/20 rounded-xl">
                                        <CreditCard className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight">Activate Subscription</h2>
                                        <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">{schoolName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-blue-100 text-xs">
                                    <Shield className="w-3.5 h-3.5" />
                                    Secured by Razorpay • 256-bit SSL Encryption
                                </div>
                            </div>

                            <div className="p-8 space-y-6">

                                {/* Success State */}
                                {status === 'success' ? (
                                    <div className="flex flex-col items-center text-center py-6 gap-4">
                                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-500">
                                            <CheckCircle2 className="w-10 h-10" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Payment Successful!</h3>
                                            <p className="text-slate-500 text-sm mt-1">
                                                Your <span className="font-bold capitalize">{selectedPlan}</span> plan is now active.
                                            </p>
                                        </div>
                                        <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                                            Valid until: {new Date(message).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </div>
                                        <button
                                            onClick={handleClose}
                                            className="mt-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-colors"
                                        >
                                            Go to Dashboard
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Plan Selection */}
                                        <div>
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                                                Select Plan — Annual Subscription
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {PLANS.map(plan => (
                                                    <button
                                                        key={plan.id}
                                                        type="button"
                                                        onClick={() => setSelectedPlan(plan.id)}
                                                        disabled={status === 'loading'}
                                                        className={cn(
                                                            "relative p-5 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer group",
                                                            selectedPlan === plan.id
                                                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02] shadow-lg shadow-blue-500/10"
                                                                : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:scale-[1.01]"
                                                        )}
                                                    >
                                                        {plan.badge && (
                                                            <span className="absolute top-3 right-3 px-2 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black rounded-full tracking-wider flex items-center gap-1">
                                                                <Sparkles className="w-2.5 h-2.5" />
                                                                {plan.badge}
                                                            </span>
                                                        )}
                                                        <div className="flex items-start gap-3 mb-3">
                                                            <div className={cn(
                                                                "w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 transition-all",
                                                                selectedPlan === plan.id
                                                                    ? "border-blue-500 bg-blue-500"
                                                                    : "border-slate-300 dark:border-slate-600"
                                                            )} />
                                                            <div>
                                                                <p className="font-black text-slate-900 dark:text-white">{plan.name}</p>
                                                                <p className={cn("text-2xl font-black mt-0.5", plan.color)}>{plan.displayPrice}</p>
                                                                <p className="text-[11px] text-slate-400 font-medium">per year</p>
                                                            </div>
                                                        </div>
                                                        <ul className="space-y-1.5">
                                                            {plan.features.map(f => (
                                                                <li key={f} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                                                    {f}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Error */}
                                        {status === 'error' && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl text-red-600 text-sm font-bold flex items-center gap-3"
                                            >
                                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                                {message}
                                            </motion.div>
                                        )}

                                        {/* CTA */}
                                        <button
                                            onClick={handlePay}
                                            disabled={status === 'loading'}
                                            className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {status === 'loading' ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <Zap className="w-5 h-5" />
                                                    Pay {PLANS.find(p => p.id === selectedPlan)?.displayPrice} · Activate Now
                                                </>
                                            )}
                                        </button>

                                        <p className="text-center text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                                            Annual billing • Auto-renews after 12 months • Cancel anytime
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
