"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Building2,
    DollarSign,
    Settings,
    LogOut,
    ShieldCheck,
    Globe,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '@/components/ui';

const NAV = [
    { name: 'Overview', icon: LayoutDashboard, href: '/superadmin/dashboard' },
    { name: 'Schools', icon: Building2, href: '/superadmin/schools' },
    { name: 'Revenue', icon: DollarSign, href: '/superadmin/revenue' },
    { name: 'Settings', icon: Settings, href: '/superadmin/settings' },
];

export const SuperAdminSidebar = () => {
    const pathname = usePathname();
    const { profile } = useAuth();

    const handleLogout = async () => {
        await signOut(auth);
        window.location.href = '/login';
    };

    return (
        <div className="flex flex-col h-screen w-64 bg-slate-900 border-r border-slate-800 fixed left-0 top-0 z-40">
            {/* Brand */}
            <div className="p-6 flex items-center gap-3 border-b border-slate-800">
                <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-xl shadow-lg shadow-violet-500/20">
                    <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                    <span className="text-base font-black text-white tracking-tight">EduCatalog</span>
                    <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Super Admin</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-4 space-y-1 mt-6">
                {NAV.map(item => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group',
                                isActive
                                    ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            )}
                        >
                            <item.icon className={cn(
                                'w-5 h-5 transition-colors',
                                isActive ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-300'
                            )} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* User Footer */}
            <div className="p-4 border-t border-slate-800">
                <div className="flex items-center gap-3 px-3 py-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-black text-sm">
                        {profile?.name?.charAt(0) ?? 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white truncate">{profile?.name ?? 'Super Admin'}</p>
                        <div className="flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-violet-400" />
                            <p className="text-[10px] text-violet-400 font-black uppercase tracking-wider">root access</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-sm font-bold text-red-400 hover:bg-red-900/20 transition-all duration-200"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </button>
            </div>
        </div>
    );
};
