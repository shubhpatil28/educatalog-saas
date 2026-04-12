"use client";

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Button, Input, cn } from '@/components/ui';
import {
    User,
    Bell,
    Lock,
    Monitor,
    CreditCard,
    Save,
    CheckCircle2,
    Clock,
    Zap,
    AlertTriangle,
    Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PaymentModal } from '@/components/PaymentModal';
import { motion } from 'framer-motion';

type TabId = 'profile' | 'security' | 'notifications' | 'appearance' | 'subscription';

const NAV_TABS: { id: TabId; name: string; icon: React.ElementType }[] = [
    { id: 'profile', name: 'Profile Information', icon: User },
    { id: 'security', name: 'Security', icon: Lock },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'appearance', name: 'Appearance', icon: Monitor },
    { id: 'subscription', name: 'Subscription', icon: CreditCard },
];

export default function SettingsPage() {
    const { profile, school } = useAuth();
    const [activeTab, setActiveTab] = useState<TabId>('profile');
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [paidPlan, setPaidPlan] = useState<string | null>(null);
    const [paidExpiry, setPaidExpiry] = useState<string | null>(null);

    const isPaid = school?.paymentStatus === 'paid' || paidPlan !== null;
    const planName = paidPlan ?? school?.plan ?? 'Trial';
    const expiryDate = paidExpiry
        ? new Date(paidExpiry)
        : school?.expiryDate?.toDate?.() ?? null;

    const daysLeft = expiryDate
        ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / 86_400_000))
        : null;

    function handlePaymentSuccess(plan: string, expiry: string) {
        setPaidPlan(plan);
        setPaidExpiry(expiry);
        setPayModalOpen(false);
    }

    return (
        <DashboardLayout allowedRoles={['principal', 'teacher']}>
            <div className="max-w-4xl mx-auto space-y-6 pb-20">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Account Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Manage your profile, security, and subscription
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Sidebar */}
                    <div className="md:col-span-1 space-y-1">
                        {NAV_TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                                    activeTab === tab.id
                                        ? "bg-white dark:bg-slate-900 shadow-sm text-blue-600 border border-slate-200 dark:border-slate-800"
                                        : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.name}
                                {tab.id === 'subscription' && !isPaid && (
                                    <span className="ml-auto w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="md:col-span-2 space-y-6">

                        {/* ── Profile Tab ─────────────────────────────────── */}
                        {activeTab === 'profile' && (
                            <Card>
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <User className="w-5 h-5 text-blue-600" />
                                    Personal Details
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <Input label="Full Name" defaultValue={profile?.name || ''} className="flex-1" />
                                        <Input label="Email Address" defaultValue={profile?.email || ''} className="flex-1" disabled />
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <Input label="Phone Number" placeholder="+91 98765 43210" className="flex-1" />
                                        {profile?.role === 'teacher' && (
                                            <Input label="Assigned Class" defaultValue={(profile as any)?.assignedClass || ''} className="flex-1" disabled />
                                        )}
                                    </div>
                                    <div className="pt-4">
                                        <Button className="gap-2">
                                            <Save className="w-4 h-4" />
                                            Save Changes
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* ── Security Tab ─────────────────────────────────── */}
                        {activeTab === 'security' && (
                            <Card>
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-blue-600" />
                                    Change Password
                                </h3>
                                <div className="space-y-4">
                                    <Input label="Current Password" type="password" />
                                    <Input label="New Password" type="password" />
                                    <Input label="Confirm New Password" type="password" />
                                    <div className="pt-4">
                                        <Button variant="outline">Update Password</Button>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* ── Notifications Tab ────────────────────────────── */}
                        {activeTab === 'notifications' && (
                            <Card>
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-blue-600" />
                                    Notification Preferences
                                </h3>
                                <p className="text-slate-500 text-sm">Notification settings coming soon.</p>
                            </Card>
                        )}

                        {/* ── Appearance Tab ───────────────────────────────── */}
                        {activeTab === 'appearance' && (
                            <Card>
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <Monitor className="w-5 h-5 text-blue-600" />
                                    Appearance
                                </h3>
                                <p className="text-slate-500 text-sm">Theme and display settings coming soon.</p>
                            </Card>
                        )}

                        {/* ── Subscription Tab ─────────────────────────────── */}
                        {activeTab === 'subscription' && (
                            <div className="space-y-5">
                                {/* Current plan card */}
                                <Card className={cn(
                                    "relative overflow-hidden border-2",
                                    isPaid ? "border-emerald-200 dark:border-emerald-800" : "border-amber-200 dark:border-amber-800"
                                )}>
                                    <div className={cn(
                                        "absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl -mr-20 -mt-20",
                                        isPaid ? "bg-emerald-500/10" : "bg-amber-500/10"
                                    )} />

                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Plan</p>
                                            <h3 className="text-3xl font-black text-slate-900 dark:text-white capitalize">
                                                {planName}
                                            </h3>
                                            {expiryDate && (
                                                <div className={cn(
                                                    "flex items-center gap-2 mt-2 text-sm font-bold",
                                                    (daysLeft ?? 0) <= 30 ? "text-amber-600" : "text-slate-500"
                                                )}>
                                                    <Clock className="w-4 h-4" />
                                                    {isPaid
                                                        ? `Valid until ${expiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                                        : `Trial expires ${expiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                                    }
                                                    {daysLeft !== null && (
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase",
                                                            (daysLeft ?? 0) <= 30
                                                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                                                                : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                                                        )}>
                                                            {daysLeft}d left
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className={cn(
                                            "flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2",
                                            isPaid
                                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                                                : "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                                        )}>
                                            {isPaid ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                            {isPaid ? 'Active' : 'Trial'}
                                        </div>
                                    </div>

                                    {/* Status note */}
                                    {!isPaid && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-2xl text-sm text-amber-700 dark:text-amber-400 font-medium"
                                        >
                                            <AlertTriangle className="w-4 h-4 inline mr-2" />
                                            You're on a free trial. Activate a paid plan to ensure uninterrupted access after the trial ends.
                                        </motion.div>
                                    )}
                                </Card>

                                {/* Upgrade / Renew CTA */}
                                {profile?.role === 'principal' && (
                                    <Card className="border-blue-100 dark:border-blue-900/50">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600">
                                                <Sparkles className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-black text-slate-900 dark:text-white">
                                                    {isPaid ? 'Upgrade or Renew Plan' : 'Activate a Paid Plan'}
                                                </h4>
                                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                    {isPaid
                                                        ? 'Switch to a higher tier or extend your subscription'
                                                        : 'Basic ₹2,000/yr · Premium ₹5,000/yr — secure payment via Razorpay'
                                                    }
                                                </p>
                                            </div>
                                            <Button
                                                onClick={() => setPayModalOpen(true)}
                                                className="flex-shrink-0 gap-2 shadow-lg shadow-blue-500/20"
                                            >
                                                <Zap className="w-4 h-4" />
                                                {isPaid ? 'Upgrade' : 'Activate Now'}
                                            </Button>
                                        </div>
                                    </Card>
                                )}

                                {/* Plan comparison mini-table */}
                                <Card>
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4">
                                        Plan Comparison
                                    </h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                                    <th className="text-left py-3 pr-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Feature</th>
                                                    <th className="text-center py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Basic</th>
                                                    <th className="text-center py-3 px-4 text-[10px] font-black text-indigo-500 uppercase tracking-widest">Premium</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                                {[
                                                    ['Students', '≤ 200', 'Unlimited'],
                                                    ['Attendance Tracking', '✓', '✓'],
                                                    ['Analytics & Reports', 'Basic', 'Advanced'],
                                                    ['QR Code Attendance', '✗', '✓'],
                                                    ['Teacher Management', '✗', '✓'],
                                                    ['Student PDF Profiles', '✗', '✓'],
                                                    ['Priority Support', '✗', '✓'],
                                                    ['Annual Price', '₹2,000', '₹5,000'],
                                                ].map(([feat, basic, premium]) => (
                                                    <tr key={feat}>
                                                        <td className="py-3 pr-4 font-medium text-slate-700 dark:text-slate-300">{feat}</td>
                                                        <td className="py-3 px-4 text-center text-slate-500">{basic}</td>
                                                        <td className="py-3 px-4 text-center text-indigo-600 font-bold">{premium}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={payModalOpen}
                onClose={() => setPayModalOpen(false)}
                schoolId={school?.schoolId ?? profile?.schoolId ?? ''}
                schoolName={school?.name ?? ''}
                email={profile?.email ?? ''}
                currentPlan={planName}
                onPaymentSuccess={handlePaymentSuccess}
            />
        </DashboardLayout>
    );
}
