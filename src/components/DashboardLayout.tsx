"use client";

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AlertTriangle, ShieldCheck, CreditCard, Zap } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { PaymentModal } from '@/components/PaymentModal';

interface DashboardLayoutProps {
    children: React.ReactNode;
    allowedRoles?: ('principal' | 'teacher' | 'superadmin')[];
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, allowedRoles }) => {
    const { user, loading, profile, school, isSubscriptionActive } = useAuth();
    const router = useRouter();
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [paidPlan, setPaidPlan] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium font-sans text-xs uppercase tracking-widest">Verifying School Access...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    // ── Role-based access control ─────────────────────────────────────────
    if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
                <Card className="max-w-md w-full text-center p-8">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Access Restricted</h2>
                    <p className="text-slate-500 mb-6">You do not have the required permissions to access this section of the portal.</p>
                    <Button onClick={() => router.push(profile.role === 'principal' ? '/dashboard/principal' : '/dashboard/teacher')} className="w-full">
                        Return to Dashboard
                    </Button>
                </Card>
            </div>
        );
    }

    // ── Payment Gate ──────────────────────────────────────────────────────
    // If school data is loaded and paymentStatus is not "paid" AND no active subscription
    const isPaymentPending = school && school.paymentStatus !== 'paid' && !isSubscriptionActive && !paidPlan;

    if (isPaymentPending && profile?.role === 'principal') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl -mr-48 -mt-24 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/8 rounded-full blur-3xl -ml-48 -mb-24 pointer-events-none" />

                <Card className="max-w-lg w-full text-center p-10 border-slate-100 dark:border-slate-800 shadow-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem]">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/25">
                        <CreditCard className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Activate Your Workspace</h2>
                    <p className="text-slate-500 mb-2 font-medium">
                        Welcome to <span className="font-black text-slate-700 dark:text-slate-200">{school?.name}</span>!
                    </p>
                    <p className="text-slate-400 text-sm mb-8">
                        Your school registration is complete. Subscribe to a plan to unlock your institutional dashboard.
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-8 text-left">
                        {[
                            { plan: 'Basic', price: '₹2,000/yr', desc: 'Up to 200 students' },
                            { plan: 'Premium', price: '₹5,000/yr', desc: 'Unlimited students + all features' },
                        ].map(p => (
                            <div key={p.plan} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <p className="font-black text-slate-900 dark:text-white text-sm">{p.plan}</p>
                                <p className="text-blue-600 font-black text-lg">{p.price}</p>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">{p.desc}</p>
                            </div>
                        ))}
                    </div>

                    <Button
                        onClick={() => alert("Payment feature is disabled for now")}
                        className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 gap-2"
                    >
                        <Zap className="w-4 h-4" />
                        Activate Subscription
                    </Button>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-4">
                        Secured by Razorpay • Cancel anytime
                    </p>
                </Card>

                <PaymentModal
                    isOpen={payModalOpen}
                    onClose={() => setPayModalOpen(false)}
                    schoolId={school?.schoolId ?? profile?.schoolId ?? ''}
                    schoolName={school?.name ?? ''}
                    email={profile?.email ?? ''}
                    currentPlan={school?.plan ?? ''}
                    onPaymentSuccess={(plan) => {
                        setPaidPlan(plan);
                        setPayModalOpen(false);
                    }}
                />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
            <Sidebar />
            <div className="flex-1 ml-64 flex flex-col">
                {/* Top bar */}
                <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-8 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-black text-slate-400 text-xs tracking-[0.2em] uppercase">Institution</span>
                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2" />
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {school?.name || 'EduCatalog Instance'}
                            <ShieldCheck className="w-4 h-4 text-blue-500" />
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        {!isSubscriptionActive && !paidPlan && (
                            <button
                                onClick={() => alert("Payment feature is disabled for now")}
                                className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-4 py-1.5 rounded-full text-xs font-bold border border-amber-100 dark:border-amber-900/30 hover:bg-amber-100 transition-colors"
                            >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Subscribe Now
                            </button>
                        )}
                        <div className="text-xs font-medium text-slate-500">
                            SaaS Tier: <span className="text-blue-600 font-bold uppercase">{paidPlan ?? school?.plan ?? 'Standard'}</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-8 transition-all duration-300 overflow-y-auto">
                    <div className="max-w-7xl mx-auto">
                        {!isSubscriptionActive && !paidPlan && (
                            <div className="mb-8 p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600">
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-amber-900 dark:text-amber-400">Subscription Required</h3>
                                        <p className="text-sm text-amber-700 dark:text-amber-500/80">Your trial is active or has expired. Subscribe to keep full access.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => alert("Payment feature is disabled for now")}
                                    className="flex-shrink-0 flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-600/20 uppercase tracking-wider transition-colors"
                                >
                                    <Zap className="w-4 h-4" />
                                    Activate Plan
                                </button>
                            </div>
                        )}
                        {children}
                    </div>
                </main>
            </div>

            {/* Global payment modal */}
            <PaymentModal
                isOpen={payModalOpen}
                onClose={() => setPayModalOpen(false)}
                schoolId={school?.schoolId ?? profile?.schoolId ?? ''}
                schoolName={school?.name ?? ''}
                email={profile?.email ?? ''}
                currentPlan={paidPlan ?? school?.plan ?? ''}
                onPaymentSuccess={(plan) => {
                    setPaidPlan(plan);
                    setPayModalOpen(false);
                }}
            />
        </div>
    );
};
