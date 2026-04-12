"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import {
    DollarSign, TrendingUp, CheckCircle2, Clock, Loader2,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui';

const PLAN_PRICES: Record<string, number> = { basic: 2000, premium: 5000, trial: 0 };
const PLAN_COLORS: Record<string, string> = { trial: '#64748b', basic: '#3b82f6', premium: '#7c3aed' };

type SchoolRow = { id: string; name: string; plan: string; paymentStatus?: string; city?: string; createdAt?: any; expiryDate?: any; };

export default function RevenuePage() {
    const [loading, setLoading] = useState(true);
    const [schools, setSchools] = useState<SchoolRow[]>([]);

    useEffect(() => {
        getDocs(collection(db, 'schools')).then(snap => {
            setSchools(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as SchoolRow[]);
        }).finally(() => setLoading(false));
    }, []);

    const paid = schools.filter(s => s.paymentStatus === 'paid');
    const totalRevenue = paid.reduce((sum, s) => sum + (PLAN_PRICES[s.plan?.toLowerCase()] ?? 0), 0);
    const pendingRevenue = schools.filter(s => s.paymentStatus !== 'paid')
        .reduce((sum, s) => sum + (PLAN_PRICES[s.plan?.toLowerCase()] ?? 0), 0);

    // Monthly breakdown
    const now = new Date();
    const monthMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthMap[d.toLocaleString('default', { month: 'short', year: '2-digit' })] = 0;
    }
    paid.forEach(s => {
        if (s.createdAt?.toDate) {
            const key = s.createdAt.toDate().toLocaleString('default', { month: 'short', year: '2-digit' });
            if (key in monthMap) monthMap[key] += PLAN_PRICES[s.plan?.toLowerCase()] ?? 0;
        }
    });
    const chartData = Object.entries(monthMap).map(([month, revenue]) => ({ month, revenue }));

    // Pie data
    const planCount: Record<string, number> = {};
    paid.forEach(s => { const p = s.plan?.toLowerCase() ?? 'trial'; planCount[p] = (planCount[p] ?? 0) + 1; });
    const pieData = Object.entries(planCount).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1), value, color: PLAN_COLORS[name] ?? '#64748b',
    }));

    const cards = [
        { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: DollarSign, c: 'text-emerald-400', bg: 'bg-emerald-900/30', b: 'border-emerald-800/50' },
        { label: 'Paid Schools', value: paid.length, icon: CheckCircle2, c: 'text-blue-400', bg: 'bg-blue-900/30', b: 'border-blue-800/50' },
        { label: 'Pending Revenue', value: `₹${pendingRevenue.toLocaleString('en-IN')}`, icon: Clock, c: 'text-amber-400', bg: 'bg-amber-900/30', b: 'border-amber-800/50' },
        { label: 'Avg / School', value: paid.length > 0 ? `₹${Math.round(totalRevenue / paid.length).toLocaleString('en-IN')}` : '₹0', icon: TrendingUp, c: 'text-violet-400', bg: 'bg-violet-900/30', b: 'border-violet-800/50' },
    ];

    if (loading) return (
        <div className="h-[70vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
            <p className="text-slate-500 font-black text-xs uppercase tracking-widest">Loading Revenue Data...</p>
        </div>
    );

    return (
        <div className="space-y-8 pb-16">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Revenue Analytics</h1>
                <p className="text-slate-500 text-xs uppercase tracking-widest font-medium mt-1">Platform subscription revenue — all schools</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {cards.map((card, i) => (
                    <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                        <div className={cn("bg-slate-900 border rounded-2xl p-6 hover:border-slate-600 transition-all group", card.b)}>
                            <div className={cn("p-3 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform", card.bg)}>
                                <card.icon className={cn("w-6 h-6", card.c)} />
                            </div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{card.label}</p>
                            <p className="text-2xl font-black text-white">{card.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-5">Monthly Revenue</h3>
                    <div className="w-full min-h-[260px]">
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#475569' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#475569' }}
                                    tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontSize: '11px' }}
                                    formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
                                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fill="url(#rg)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Revenue by Plan</h3>
                    <div className="w-full min-h-[180px]">
                        <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={4}>
                                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontSize: '11px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-3">
                        {pieData.map(p => (
                            <div key={p.name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-2.5 h-2.5 rounded-full",
                                        p.name === 'Premium' ? 'bg-violet-600' :
                                        p.name === 'Basic' ? 'bg-blue-500' : 'bg-slate-500'
                                    )} />
                                    <span className="text-slate-400 font-bold uppercase tracking-wider">{p.name}</span>
                                </div>
                                <span className="font-black text-white">{p.value} schools</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Ledger */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Revenue Ledger</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-800/60">
                            <tr>
                                {['School', 'City', 'Plan', 'Amount', 'Expiry'].map(h => (
                                    <th key={h} className="py-4 px-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {paid.length === 0 ? (
                                <tr><td colSpan={5} className="py-16 text-center text-slate-600 font-bold">No paid subscriptions yet.</td></tr>
                            ) : paid.map(s => (
                                <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="py-4 px-6">
                                        <p className="font-black text-white text-sm">{s.name}</p>
                                        <p className="text-[10px] font-mono text-slate-500">{s.id}</p>
                                    </td>
                                    <td className="py-4 px-6 text-slate-400">{s.city ?? '—'}</td>
                                    <td className="py-4 px-6">
                                        <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase",
                                            s.plan === 'premium' ? 'bg-violet-900/30 text-violet-400 border border-violet-700/30' : 'bg-blue-900/30 text-blue-400 border border-blue-700/30')}>
                                            {s.plan}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 font-black text-emerald-400">
                                        ₹{(PLAN_PRICES[s.plan?.toLowerCase()] ?? 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="py-4 px-6 text-slate-500 text-xs">
                                        {s.expiryDate?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) ?? '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
