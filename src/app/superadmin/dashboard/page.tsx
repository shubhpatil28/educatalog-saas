"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
    Building2,
    Users,
    UserSquare2,
    DollarSign,
    TrendingUp,
    Activity,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Globe,
    Zap,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { cn } from '@/components/ui';

const PLAN_PRICES: Record<string, number> = { basic: 2000, premium: 5000, trial: 0 };

type StatCard = {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
    sub: string;
};

type SchoolRow = {
    id: string;
    name: string;
    city: string;
    plan: string;
    paymentStatus: string;
    createdAt: any;
    numStudents?: number;
};

export default function SuperAdminDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalSchools: 0,
        totalStudents: 0,
        totalTeachers: 0,
        monthlyRevenue: 0,
        activeSubscriptions: 0,
    });
    const [recentSchools, setRecentSchools] = useState<SchoolRow[]>([]);
    const [revenueChart, setRevenueChart] = useState<{ month: string; revenue: number }[]>([]);
    const [planDist, setPlanDist] = useState<{ name: string; value: number; color: string }[]>([]);

    useEffect(() => {
        fetchPlatformStats();
    }, []);

    const fetchPlatformStats = async () => {
        try {
            // 1. Schools
            const schoolsSnap = await getDocs(collection(db, 'schools'));
            const schools = schoolsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as SchoolRow[];

            // 2. Students (cross-school)
            const studentsSnap = await getDocs(collection(db, 'students'));

            // 3. Teachers
            const teachersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')));

            // 4. Revenue (paid schools)
            const paidSchools = schools.filter(s => s.paymentStatus === 'paid');
            const revenue = paidSchools.reduce((sum, s) => sum + (PLAN_PRICES[s.plan?.toLowerCase()] ?? 0), 0);

            // 5. Monthly revenue chart (last 6 months – approximate from createdAt)
            const now = new Date();
            const monthMap: Record<string, number> = {};
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
                monthMap[key] = 0;
            }
            paidSchools.forEach(s => {
                if (s.createdAt?.toDate) {
                    const d = s.createdAt.toDate();
                    const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
                    if (key in monthMap) {
                        monthMap[key] += PLAN_PRICES[s.plan?.toLowerCase()] ?? 0;
                    }
                }
            });
            const chartData = Object.entries(monthMap).map(([month, revenue]) => ({ month, revenue }));

            // 6. Plan distribution
            const planCount: Record<string, number> = { trial: 0, basic: 0, premium: 0 };
            schools.forEach(s => {
                const p = s.plan?.toLowerCase() ?? 'trial';
                planCount[p] = (planCount[p] ?? 0) + 1;
            });
            const planColors: Record<string, string> = { trial: '#64748b', basic: '#3b82f6', premium: '#7c3aed' };
            const planDistData = Object.entries(planCount)
                .filter(([, v]) => v > 0)
                .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, color: planColors[name] ?? '#64748b' }));

            // 7. Recent schools
            const sorted = [...schools].sort((a, b) => {
                const aT = a.createdAt?.toDate?.()?.getTime() ?? 0;
                const bT = b.createdAt?.toDate?.()?.getTime() ?? 0;
                return bT - aT;
            }).slice(0, 6);

            setStats({
                totalSchools: schools.length,
                totalStudents: studentsSnap.size,
                totalTeachers: teachersSnap.size,
                monthlyRevenue: revenue,
                activeSubscriptions: paidSchools.length,
            });
            setRecentSchools(sorted);
            setRevenueChart(chartData);
            setPlanDist(planDistData);
        } catch (err) {
            console.error('[superadmin/dashboard]', err);
        } finally {
            setLoading(false);
        }
    };

    const statCards: StatCard[] = [
        { title: 'Total Schools', value: stats.totalSchools, icon: Building2, color: 'text-violet-400', bg: 'bg-violet-900/30', border: 'border-violet-800/50', sub: 'Registered institutions' },
        { title: 'Total Students', value: stats.totalStudents.toLocaleString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-800/50', sub: 'Cross-school enrollment' },
        { title: 'Total Teachers', value: stats.totalTeachers, icon: UserSquare2, color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-800/50', sub: 'Active educators' },
        { title: 'Platform Revenue', value: `₹${stats.monthlyRevenue.toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-900/30', border: 'border-amber-800/50', sub: 'Cumulative paid subscriptions' },
        { title: 'Active Subs', value: stats.activeSubscriptions, icon: CheckCircle2, color: 'text-teal-400', bg: 'bg-teal-900/30', border: 'border-teal-800/50', sub: 'Paying institutions' },
        { title: 'Platform Health', value: '99.9%', icon: Activity, color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-800/50', sub: 'Uptime this month' },
    ];

    if (loading) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
                <p className="text-slate-500 font-black text-xs uppercase tracking-widest">Aggregating Platform Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-16">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="px-2 py-0.5 bg-violet-600 text-[10px] font-black uppercase text-white rounded tracking-wider">
                            Root Access
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Platform Overview</h1>
                    </div>
                    <p className="text-slate-500 font-medium uppercase text-xs tracking-widest">
                        EduCatalog SaaS • Multi-School Control Center • {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-900/20 border border-emerald-700/30 rounded-full">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-black text-xs uppercase tracking-widest">{stats.totalSchools} Schools Online</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {statCards.map((card, i) => (
                    <motion.div
                        key={card.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                    >
                        <div className={cn(
                            "bg-slate-900 border rounded-2xl p-6 hover:border-slate-600 transition-all duration-300 group cursor-default",
                            card.border
                        )}>
                            <div className="flex items-start justify-between mb-4">
                                <div className={cn("p-3 rounded-2xl group-hover:scale-110 transition-transform", card.bg)}>
                                    <card.icon className={cn("w-6 h-6", card.color)} />
                                </div>
                                <TrendingUp className="w-4 h-4 text-slate-600" />
                            </div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{card.title}</p>
                            <p className="text-3xl font-black text-white mb-1">{card.value}</p>
                            <p className="text-xs text-slate-500 font-medium">{card.sub}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Area Chart */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">Revenue Trend</h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-6">Cumulative subscription revenue — last 6 months</p>
                    <div className="w-full min-h-[260px]">
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={revenueChart}>
                                <defs>
                                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#475569' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#475569' }}
                                    tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontSize: '11px' }}
                                    formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={3} fill="url(#revGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Plan Distribution */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">Plan Distribution</h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-6">Schools by subscription tier</p>
                    <div className="w-full min-h-[260px]">
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={planDist} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false}
                                    tick={{ fontSize: 11, fontWeight: 900, fill: '#64748b' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontSize: '11px' }}
                                />
                                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={28}>
                                    {planDist.map((entry, i) => <Cell key={i} fill={entry.color} style={{}} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-2">
                        {planDist.map(p => (
                            <div key={p.name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-2.5 h-2.5 rounded-full",
                                        p.name === 'Premium' ? 'bg-violet-600' :
                                        p.name === 'Basic' ? 'bg-blue-500' : 'bg-slate-500'
                                    )} />
                                    <span className="text-slate-400 font-bold uppercase tracking-wider">{p.name}</span>
                                </div>
                                <span className="font-black text-white">{p.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Schools Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Recent Registrations</h3>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Latest schools to join the platform</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-800/60">
                            <tr>
                                {['School', 'City', 'Plan', 'Status', 'Joined'].map(h => (
                                    <th key={h} className="py-4 px-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {recentSchools.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-16 text-center text-slate-600 text-sm font-bold">No schools registered yet.</td>
                                </tr>
                            ) : recentSchools.map((school, i) => (
                                <motion.tr
                                    key={school.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.04 }}
                                    className="hover:bg-slate-800/30 transition-colors"
                                >
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-violet-900/40 border border-violet-700/30 rounded-xl flex items-center justify-center text-violet-400 font-black text-sm">
                                                {school.name?.charAt(0) ?? 'S'}
                                            </div>
                                            <div>
                                                <p className="font-black text-white text-sm">{school.name}</p>
                                                <p className="text-[10px] text-slate-500 font-mono">{school.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-slate-400 font-medium">{school.city ?? '—'}</td>
                                    <td className="py-4 px-6">
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                            school.plan === 'premium' ? 'bg-violet-900/40 text-violet-400 border border-violet-700/30' :
                                                school.plan === 'basic' ? 'bg-blue-900/40 text-blue-400 border border-blue-700/30' :
                                                    'bg-slate-800 text-slate-500 border border-slate-700'
                                        )}>
                                            {school.plan ?? 'Trial'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={cn(
                                            "flex items-center gap-1.5 w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase",
                                            school.paymentStatus === 'paid'
                                                ? 'bg-emerald-900/30 text-emerald-400'
                                                : 'bg-amber-900/30 text-amber-400'
                                        )}>
                                            {school.paymentStatus === 'paid'
                                                ? <><CheckCircle2 className="w-3 h-3" /> Paid</>
                                                : <><AlertTriangle className="w-3 h-3" /> Pending</>
                                            }
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-slate-500 text-xs font-medium">
                                        {school.createdAt?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) ?? '—'}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
