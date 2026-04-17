"use client";

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Button } from '@/components/ui';
import {
    Users,
    UserSquare2,
    School,
    CalendarCheck,
    Plus,
    TrendingUp,
    Download,
    Clock,
    ArrowUpRight,
    ShieldCheck,
    Loader2
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    Cell
} from 'recharts';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { cn } from '@/components/ui';
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

export default function PrincipalDashboard() {
    const { profile, school } = useAuth();
    const [stats, setStats] = useState<{
        totalStudents: number;
        totalTeachers: number;
        activeClasses: number;
        todayAttendance: number | string;
    }>({
        totalStudents: 0,
        totalTeachers: 0,
        activeClasses: 12, // Mock or fetch from a classes collection
        todayAttendance: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.schoolId) return;

        const fetchStats = async () => {
            setLoading(true);
            try {
                // 1. Total Students Audit
                const studentSnap = await getDocs(query(
                    collection(db, 'students'), 
                    where('schoolId', '==', profile.schoolId)
                ));

                // 2. Faculty Identity Check
                const teacherSnap = await getDocs(query(
                    collection(db, 'users'),
                    where('schoolId', '==', profile.schoolId),
                    where('role', '==', 'teacher')
                ));

                // 3. Daily Attendance Compliance
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const attendanceSnap = await getDocs(query(
                    collection(db, 'attendance'),
                    where('schoolId', '==', profile.schoolId),
                    where('date', '>=', Timestamp.fromDate(today))
                ));

                const presentCount = attendanceSnap.docs.filter(doc => doc.data().status === 'present').length;
                const totalRecorded = attendanceSnap.size;
                const percentage = totalRecorded > 0 ? (presentCount / totalRecorded) * 100 : 0;

                setStats({
                    totalStudents: studentSnap.size,
                    totalTeachers: teacherSnap.size,
                    activeClasses: 12,
                    todayAttendance: percentage.toFixed(1)
                });
            } catch (err) {
                console.error("Dashboard Intelligence Sync Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [profile?.schoolId]);

    if (loading) {
        return (
            <DashboardLayout allowedRoles={['principal']}>
                <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Loading Institutional Intelligence...</p>
                </div>
            </DashboardLayout>
        );
    }

    const dashboardStats = [
        { title: 'Total Students', value: stats.totalStudents.toLocaleString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-100', change: '+2.5%', subtext: 'Growth rate' },
        { title: 'Total Teachers', value: stats.totalTeachers, icon: UserSquare2, color: 'text-purple-600', bg: 'bg-purple-100', change: 'Active', subtext: 'Faculty count' },
        { title: 'Active Classes', value: stats.activeClasses, icon: School, color: 'text-orange-600', bg: 'bg-orange-100', change: 'Live', subtext: 'Classrooms' },
        { title: 'Today\'s Attendance', value: `${stats.todayAttendance}%`, icon: CalendarCheck, color: 'text-emerald-600', bg: 'bg-emerald-100', change: 'Real-time', subtext: 'Daily average' },
    ];

    const attendanceHistory = [
        { name: 'Mon', attendance: 95, prev: 90 },
        { name: 'Tue', attendance: 92, prev: 91 },
        { name: 'Wed', attendance: 98, prev: 89 },
        { name: 'Thu', attendance: 94, prev: 93 },
        { name: 'Fri', attendance: 96, prev: 95 },
    ];

    const classDistribution = [
        { name: 'Class 1', students: 40, color: '#3b82f6' },
        { name: 'Class 2', students: 35, color: '#6366f1' },
        { name: 'Class 3', students: 45, color: '#8b5cf6' },
        { name: 'Class 4', students: 30, color: '#a855f7' },
        { name: 'Class 5', students: 50, color: '#d946ef' },
    ];

    if (loading) {
        return (
            <DashboardLayout allowedRoles={['principal']}>
                <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Loading Executive Dashboard...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout allowedRoles={['principal']}>
            <div className="space-y-8">
                {/* Modern Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-blue-600 text-[10px] font-black uppercase text-white rounded">Admin</span>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">System Analytics</h1>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium uppercase text-xs tracking-widest">
                            Monitoring {school?.name || 'Institutional Domain'} • Academic Year 2026-27
                        </p>
                    </div>

                    <Link href="/dashboard/principal/teachers">
                        <Button className="h-12 px-6 rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all gap-2 group">
                            <UserSquare2 className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-black uppercase tracking-widest">Faculty Management</span>
                        </Button>
                    </Link>
                </div>

                {/* Improved Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {dashboardStats.map((stat, index) => (
                        <motion.div
                            key={stat.title}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="hover:shadow-xl transition-all duration-300 border-slate-100 dark:border-slate-800/50 group cursor-default">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={cn("p-3 rounded-2xl group-hover:scale-110 transition-transform", stat.bg)}>
                                        <stat.icon className={cn("w-6 h-6", stat.color)} />
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.title}</span>
                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-none">{stat.value}</h3>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-black uppercase">
                                        {stat.change}
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{stat.subtext}</span>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Advanced Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    Attendance Trends
                                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                                </h3>
                                <p className="text-xs text-slate-500 font-black uppercase tracking-[0.2em]">Real-time engagement tracking</p>
                            </div>
                        </div>
                        <div className="h-80 w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={attendanceHistory}>
                                    <defs>
                                        <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                                        domain={[0, 100]}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                                        itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="attendance"
                                        stroke="#2563eb"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorCurrent)"
                                        name="Current Week"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className="flex flex-col bg-slate-900 border-none shadow-2xl">
                        <h3 className="text-lg font-black text-white mb-8 uppercase tracking-widest">Enrollment Split</h3>
                        <div className="flex-1 min-h-[300px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={classDistribution} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff' }}
                                    />
                                    <Bar dataKey="students" radius={[0, 10, 10, 0]} barSize={24}>
                                        {classDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
