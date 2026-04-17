"use client";

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Button } from '@/components/ui';
import {
    Users,
    CalendarCheck,
    ArrowRight,
    UserPlus,
    FileText,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    Timestamp,
    orderBy,
    limit,
    getDocs
} from 'firebase/firestore';

export default function TeacherDashboard() {
    const { profile } = useAuth();
    const [stats, setStats] = useState<{
        totalStudents: number;
        markedToday: number;
    }>({
        totalStudents: 0,
        markedToday: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.schoolId) return;

        const fetchStats = async () => {
            setLoading(true);
            try {
                // 1. Classroom Registry Shard
                const studentSnap = await getDocs(query(
                    collection(db, 'students'),
                    where('schoolId', '==', profile.schoolId)
                ));

                // 2. Today's Attendance Node
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const attendanceSnap = await getDocs(query(
                    collection(db, 'attendance'),
                    where('schoolId', '==', profile.schoolId),
                    where('date', '>=', Timestamp.fromDate(today))
                ));

                setStats({
                    totalStudents: studentSnap.size,
                    markedToday: attendanceSnap.size
                });
            } catch (err) {
                console.error("Teacher Portal Sync Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [profile?.schoolId]);

    const dashboardStats = [
        { title: 'My Students', value: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100', href: '/students' },
        { title: 'Attendance Today', value: `${stats.markedToday}/${stats.totalStudents}`, icon: CalendarCheck, color: 'text-emerald-600', bg: 'bg-emerald-100', href: '/attendance' },
        { title: 'Academic Year', value: '2026-27', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100', href: '#' },
    ];

    const quickActions = [
        { name: 'Take Attendance', icon: CalendarCheck, href: '/attendance', description: 'Log daily student presence' },
        { name: 'Enroll Student', icon: UserPlus, href: '/students', description: 'Access the catalog to add records' },
        { name: 'Institution Logs', icon: FileText, href: '/attendance', description: 'Review historical archives' },
    ];

    if (loading) {
        return (
            <DashboardLayout allowedRoles={['teacher']}>
                <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs text-center leading-relaxed">
                        Initializing Faculty Workspace...<br />
                        <span className="text-[10px] opacity-60">Synchronizing Institutional Records</span>
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout allowedRoles={['teacher']}>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">System Portal</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium uppercase text-xs tracking-widest mt-1">
                            Greeting Assistant, <span className="text-blue-600 font-bold">{profile?.name}</span> • {profile?.class ? `Class ${profile.class}-${profile.division || 'A'}` : 'General Faculty'}
                        </p>
                    </div>
                    <div className="hidden md:block text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Session Protocol</p>
                        <p className="text-lg font-black text-blue-600 tracking-tighter">SEC_2026_ACTIVE</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {dashboardStats.map((stat, index) => (
                        <motion.div
                            key={stat.title}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Link href={stat.href}>
                                <Card className="hover:shadow-xl transition-all hover:-translate-y-1 group border-slate-100 dark:border-slate-800/50">
                                    <div className="flex items-center gap-5">
                                        <div className={cn("p-4 rounded-3xl transition-transform group-hover:scale-110", stat.bg)}>
                                            <stat.icon className={cn("w-7 h-7", stat.color)} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.title}</p>
                                            <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-none">{stat.value}</h3>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Quick Actions */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">Operational Tasking</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {quickActions.map((action, i) => (
                                <motion.div
                                    key={action.name}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <Link href={action.href}>
                                        <Card className="hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all p-6 group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 dark:bg-slate-800 group-hover:bg-blue-600/5 rounded-full -mr-12 -mt-12 transition-colors" />
                                            <div className="flex items-start gap-5 relative z-10">
                                                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 group-hover:border-blue-500 transition-colors">
                                                    <action.icon className="w-6 h-6 text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-black text-slate-900 dark:text-white text-lg tracking-tight">{action.name}</h4>
                                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{action.description}</p>
                                                </div>
                                                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-all group-hover:translate-x-1" />
                                            </div>
                                        </Card>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>

                        {/* Attendance Tracker Visual */}
                        <Card className="bg-slate-900 border-none shadow-2xl overflow-hidden p-8 text-white relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full -mr-32 -mt-32" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-[0.2em]">Efficiency Audit</h3>
                                        <p className="text-xs text-slate-400 font-medium">Daily compliance and reporting status</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-md">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-black text-white/60">Today's Progress</span>
                                        <span className="text-sm font-black">{stats.totalStudents > 0 ? Math.round((stats.markedToday / stats.totalStudents) * 100) : 0}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${stats.totalStudents > 0 ? (stats.markedToday / stats.totalStudents) * 100 : 0}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                                        />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mt-4">
                                        Status: {stats.markedToday === stats.totalStudents && stats.totalStudents > 0 ? 'Fully Synchronized' : 'Logs Pending Sync'}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Activity Feed */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">System Feed</h3>
                        <Card className="h-full border-slate-100 dark:border-slate-800/50">
                            <div className="space-y-8">
                                {[
                                    { title: 'Database Sync', desc: 'Class records and student dossiers have been updated.', time: 'System Live', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                                    { title: 'Registry Alert', desc: 'Manual override required for 2 unlinked student IDs.', time: 'Action Needed', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                                    { title: 'Archival Ready', desc: 'Monthly attendance reports are ready for export.', time: '2h ago', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                                ].map((update, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 + i * 0.1 }}
                                        className="flex gap-4 group"
                                    >
                                        <div className={cn("flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110", update.bg, "border-transparent")}>
                                            <update.icon className={cn("w-6 h-6", update.color)} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">{update.title}</h4>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{update.time}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed font-medium">{update.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            <Button variant="ghost" className="w-full mt-8 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-t border-slate-100 dark:border-slate-800 rounded-none pt-6 hover:bg-transparent">
                                Full Registry Audit
                            </Button>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
