"use client";

import React from 'react';
import { SuperAdminSidebar } from '@/components/SuperAdminSidebar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-violet-600/20 border-t-violet-600 rounded-full animate-spin" />
                    <p className="text-slate-500 font-black text-xs uppercase tracking-widest">Verifying Super Admin Access...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    if (profile && profile.role !== 'superadmin') {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950 p-4">
                <div className="max-w-md w-full text-center bg-slate-900 border border-slate-800 rounded-3xl p-10">
                    <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                        <ShieldAlert className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-black text-white mb-2">Access Denied</h2>
                    <p className="text-slate-400 mb-6 text-sm">You do not have Super Admin privileges.</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-colors"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-950">
            <SuperAdminSidebar />
            <div className="flex-1 ml-64 flex flex-col min-h-screen">
                {/* Top bar */}
                <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-violet-600/20 border border-violet-500/30 rounded-full text-violet-400 text-[10px] font-black uppercase tracking-widest">
                            Super Admin
                        </div>
                        <span className="text-slate-500 text-xs font-medium">EduCatalog Platform Control</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Platform Live</span>
                    </div>
                </header>

                <main className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
