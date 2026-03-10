"use client";

import React from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button, Card } from '@/components/ui';

interface DashboardLayoutProps {
    children: React.ReactNode;
    allowedRoles?: ('principal' | 'teacher' | 'superadmin')[];
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, allowedRoles }) => {
    const { user, loading, profile, school, isSubscriptionActive } = useAuth();
    const router = useRouter();

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

    // Role-based access control check
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

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
            <Sidebar />
            <div className="flex-1 ml-64 flex flex-col">
                {/* Top bar for multi-tenant info */}
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
                        {!isSubscriptionActive && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-4 py-1.5 rounded-full text-xs font-bold border border-amber-100 dark:border-amber-900/30 flex items-center gap-2 animate-pulse">
                                <AlertTriangle className="w-4 h-4" />
                                Subscription Alert: Action Required
                            </div>
                        )}
                        <div className="text-xs font-medium text-slate-500">
                            SaaS Tier: <span className="text-blue-600 font-bold uppercase">{school?.plan || 'Standard'}</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-8 transition-all duration-300 overflow-y-auto">
                    <div className="max-w-7xl mx-auto">
                        {!isSubscriptionActive && (
                            <div className="mb-8 p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600">
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-red-900 dark:text-red-400">Subscription Expired / Inactive</h3>
                                        <p className="text-sm text-red-700 dark:text-red-500/80">Your school's access is limited. Please contact your administrator to renew.</p>
                                    </div>
                                </div>
                                <button className="px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-600/20">Renew Now</button>
                            </div>
                        )}
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};
