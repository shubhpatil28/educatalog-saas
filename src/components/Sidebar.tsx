"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    UserSquare2,
    CalendarCheck,
    FileBarChart,
    Search,
    Settings,
    LogOut,
    GraduationCap
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '@/components/ui';

export const Sidebar = () => {
    const pathname = usePathname();
    const { profile } = useAuth();
    const isPrincipal = profile?.role === 'principal';

    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, href: isPrincipal ? '/dashboard/principal' : '/dashboard/teacher', roles: ['principal', 'teacher'] },
        { name: 'Student Catalog', icon: Users, href: '/students', roles: ['teacher', 'principal'] },
        { name: 'Attendance', icon: CalendarCheck, href: '/attendance', roles: ['teacher'] },
        { name: 'Search', icon: Search, href: '/search', roles: ['principal', 'teacher'] },
        { name: 'Teachers', icon: UserSquare2, href: '/teacher-management', roles: ['principal'] },
        { name: 'Reports', icon: FileBarChart, href: '/reports', roles: ['principal', 'teacher'] },
        { name: 'Settings', icon: Settings, href: '/settings', roles: ['principal', 'teacher'] },
    ];

    const handleLogout = async () => {
        await signOut(auth);
        window.location.href = '/login';
    };

    return (
        <div className="flex flex-col h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 fixed left-0 top-0 z-40">
            <div className="p-6 flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                    <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    EduCatalog
                </span>
            </div>

            <nav className="flex-1 px-4 space-y-1 mt-4">
                {menuItems
                    .filter(item => item.roles.includes(profile?.role || ''))
                    .map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                                    isActive
                                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                                        : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                                )}
                            >
                                <item.icon className={cn(
                                    "w-5 h-5 transition-colors",
                                    isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
                                )} />
                                {item.name}
                            </Link>
                        );
                    })}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 px-4 py-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold">
                        {profile?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold truncate dark:text-slate-200">{profile?.name || 'User'}</p>
                        <p className="text-xs text-slate-500 capitalize">{profile?.role || 'Role'}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-all duration-200"
                >
                    <LogOut className="w-5 h-5" />
                    Logout
                </button>
            </div>
        </div>
    );
};
