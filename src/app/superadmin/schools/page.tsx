"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    Search,
    Filter,
    CheckCircle2,
    AlertTriangle,
    Trash2,
    Zap,
    ShieldOff,
    ShieldCheck,
    Loader2,
    RefreshCw,
    X,
    CreditCard,
} from 'lucide-react';
import { cn } from '@/components/ui';

type School = {
    id: string;
    name: string;
    city?: string;
    plan: string;
    paymentStatus?: string;
    subscriptionStatus?: string;
    numStudents?: number;
    createdAt?: any;
    expiryDate?: any;
    email?: string;
};

type FilterStatus = 'all' | 'paid' | 'pending' | 'suspended';

const PLAN_OPTIONS = ['trial', 'basic', 'premium'];

export default function SchoolsManagementPage() {
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [confirmDelete, setConfirmDelete] = useState<School | null>(null);
    const [upgradePlan, setUpgradePlan] = useState<{ school: School; plan: string } | null>(null);

    const fetchSchools = useCallback(async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, 'schools'));
            const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as School[];
            list.sort((a, b) => (b.createdAt?.toDate?.()?.getTime() ?? 0) - (a.createdAt?.toDate?.()?.getTime() ?? 0));
            setSchools(list);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSchools(); }, [fetchSchools]);

    const handleActivate = async (school: School) => {
        setActionLoading(school.id + '_activate');
        try {
            const expiry = new Date();
            expiry.setFullYear(expiry.getFullYear() + 1);
            await updateDoc(doc(db, 'schools', school.id), {
                subscriptionStatus: 'active',
                paymentStatus: 'paid',
                expiryDate: Timestamp.fromDate(expiry),
                updatedAt: serverTimestamp(),
            });
            setSchools(prev => prev.map(s => s.id === school.id
                ? { ...s, subscriptionStatus: 'active', paymentStatus: 'paid' }
                : s
            ));
        } finally {
            setActionLoading(null);
        }
    };

    const handleSuspend = async (school: School) => {
        setActionLoading(school.id + '_suspend');
        try {
            await updateDoc(doc(db, 'schools', school.id), {
                subscriptionStatus: 'suspended',
                updatedAt: serverTimestamp(),
            });
            setSchools(prev => prev.map(s => s.id === school.id
                ? { ...s, subscriptionStatus: 'suspended' }
                : s
            ));
        } finally {
            setActionLoading(null);
        }
    };

    const handleUpgradePlan = async () => {
        if (!upgradePlan) return;
        const { school, plan } = upgradePlan;
        setActionLoading(school.id + '_plan');
        try {
            await updateDoc(doc(db, 'schools', school.id), {
                plan,
                updatedAt: serverTimestamp(),
            });
            setSchools(prev => prev.map(s => s.id === school.id ? { ...s, plan } : s));
            setUpgradePlan(null);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setActionLoading(confirmDelete.id + '_delete');
        try {
            await deleteDoc(doc(db, 'schools', confirmDelete.id));
            setSchools(prev => prev.filter(s => s.id !== confirmDelete.id));
            setConfirmDelete(null);
        } finally {
            setActionLoading(null);
        }
    };

    const filtered = schools.filter(s => {
        const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase())
            || s.city?.toLowerCase().includes(search.toLowerCase())
            || s.id?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'all' ? true
            : filterStatus === 'paid' ? s.paymentStatus === 'paid'
                : filterStatus === 'pending' ? s.paymentStatus !== 'paid' && s.subscriptionStatus !== 'suspended'
                    : s.subscriptionStatus === 'suspended';
        return matchSearch && matchStatus;
    });

    const statusBadge = (school: School) => {
        if (school.subscriptionStatus === 'suspended')
            return <span className="px-2 py-0.5 bg-red-900/30 text-red-400 border border-red-700/30 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit"><ShieldOff className="w-2.5 h-2.5" />Suspended</span>;
        if (school.paymentStatus === 'paid')
            return <span className="px-2 py-0.5 bg-emerald-900/30 text-emerald-400 border border-emerald-700/30 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit"><CheckCircle2 className="w-2.5 h-2.5" />Active</span>;
        return <span className="px-2 py-0.5 bg-amber-900/30 text-amber-400 border border-amber-700/30 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit"><AlertTriangle className="w-2.5 h-2.5" />Pending</span>;
    };

    return (
        <div className="space-y-7 pb-16">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Schools Management</h1>
                    <p className="text-slate-500 font-medium uppercase text-xs tracking-widest mt-1">
                        {schools.length} institutions registered on the platform
                    </p>
                </div>
                <button onClick={fetchSchools} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    Refresh
                </button>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name, city or school ID..."
                        className="w-full h-11 pl-11 pr-4 bg-slate-900 border border-slate-700 text-slate-200 rounded-xl text-sm placeholder:text-slate-600 focus:outline-none focus:border-violet-600 transition-colors"
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'paid', 'pending', 'suspended'] as FilterStatus[]).map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                            className={cn(
                                "px-4 h-11 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all",
                                filterStatus === s
                                    ? "bg-violet-600 text-white"
                                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                            )}>
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="py-32 flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Fetching schools...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-800/60">
                                <tr>
                                    {['Institution', 'City', 'Plan', 'Students', 'Status', 'Expires', 'Actions'].map(h => (
                                        <th key={h} className="py-4 px-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center text-slate-600 font-bold">No schools found.</td>
                                    </tr>
                                ) : filtered.map((school, i) => (
                                    <motion.tr key={school.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="hover:bg-slate-800/30 transition-colors"
                                    >
                                        <td className="py-4 px-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 flex-shrink-0 bg-violet-900/40 border border-violet-700/30 rounded-xl flex items-center justify-center text-violet-400 font-black text-sm">
                                                    {school.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-white">{school.name}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono">{school.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-5 text-slate-400 font-medium">{school.city ?? '—'}</td>
                                        <td className="py-4 px-5">
                                            <span className={cn(
                                                "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                                                school.plan === 'premium' ? 'bg-violet-900/40 text-violet-400 border border-violet-700/30' :
                                                    school.plan === 'basic' ? 'bg-blue-900/40 text-blue-400 border border-blue-700/30' :
                                                        'bg-slate-800 text-slate-500 border border-slate-700'
                                            )}>
                                                {school.plan ?? 'trial'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 text-slate-300 font-bold">{school.numStudents ?? '—'}</td>
                                        <td className="py-4 px-5">{statusBadge(school)}</td>
                                        <td className="py-4 px-5 text-slate-500 text-xs whitespace-nowrap">
                                            {school.expiryDate?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) ?? '—'}
                                        </td>
                                        <td className="py-4 px-5">
                                            <div className="flex items-center gap-2">
                                                {/* Activate */}
                                                {school.paymentStatus !== 'paid' && school.subscriptionStatus !== 'suspended' && (
                                                    <button onClick={() => handleActivate(school)}
                                                        disabled={!!actionLoading}
                                                        title="Activate school"
                                                        className="p-2 bg-emerald-900/30 hover:bg-emerald-900/60 text-emerald-400 rounded-lg transition-colors"
                                                    >
                                                        {actionLoading === school.id + '_activate'
                                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                                            : <ShieldCheck className="w-4 h-4" />}
                                                    </button>
                                                )}
                                                {/* Suspend / Unsuspend */}
                                                <button
                                                    onClick={() => school.subscriptionStatus === 'suspended' ? handleActivate(school) : handleSuspend(school)}
                                                    disabled={!!actionLoading}
                                                    title={school.subscriptionStatus === 'suspended' ? 'Unsuspend' : 'Suspend'}
                                                    className="p-2 bg-red-900/30 hover:bg-red-900/60 text-red-400 rounded-lg transition-colors"
                                                >
                                                    {actionLoading === school.id + '_suspend'
                                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                                        : <ShieldOff className="w-4 h-4" />}
                                                </button>
                                                {/* Upgrade Plan */}
                                                <button onClick={() => setUpgradePlan({ school, plan: school.plan ?? 'trial' })}
                                                    disabled={!!actionLoading}
                                                    title="Change plan"
                                                    className="p-2 bg-blue-900/30 hover:bg-blue-900/60 text-blue-400 rounded-lg transition-colors"
                                                >
                                                    <CreditCard className="w-4 h-4" />
                                                </button>
                                                {/* Delete */}
                                                <button onClick={() => setConfirmDelete(school)}
                                                    disabled={!!actionLoading}
                                                    title="Delete school"
                                                    className="p-2 bg-slate-800 hover:bg-red-900/30 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Confirm Modal */}
            <AnimatePresence>
                {confirmDelete && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={() => setConfirmDelete(null)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-sm w-full pointer-events-auto text-center">
                                <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-5 text-red-500">
                                    <Trash2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-black text-white mb-2">Delete School?</h3>
                                <p className="text-slate-400 text-sm mb-6">
                                    <span className="font-bold text-white">{confirmDelete.name}</span> will be permanently removed. This cannot be undone.
                                </p>
                                <div className="flex gap-3">
                                    <button onClick={() => setConfirmDelete(null)}
                                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black text-sm uppercase tracking-widest transition-colors">
                                        Cancel
                                    </button>
                                    <button onClick={handleDelete} disabled={!!actionLoading}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-colors">
                                        {actionLoading?.includes('_delete') ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Upgrade Plan Modal */}
            <AnimatePresence>
                {upgradePlan && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={() => setUpgradePlan(null)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-sm w-full pointer-events-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-black text-white">Change Plan</h3>
                                    <button onClick={() => setUpgradePlan(null)} title="Close" aria-label="Close dialog" className="p-2 rounded-xl hover:bg-slate-800 text-slate-400">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className="text-slate-400 text-sm mb-4">Updating plan for <span className="font-bold text-white">{upgradePlan.school.name}</span></p>
                                <div className="space-y-2 mb-6">
                                    {PLAN_OPTIONS.map(p => (
                                        <button key={p} onClick={() => setUpgradePlan(u => u ? { ...u, plan: p } : null)}
                                            className={cn(
                                                "w-full py-3 px-4 rounded-xl border text-sm font-black uppercase tracking-wider transition-all text-left",
                                                upgradePlan.plan === p
                                                    ? "border-violet-500 bg-violet-900/30 text-violet-400"
                                                    : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600"
                                            )}>
                                            {p}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={handleUpgradePlan} disabled={!!actionLoading}
                                    className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                    {actionLoading?.includes('_plan') ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4" />Update Plan</>}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
