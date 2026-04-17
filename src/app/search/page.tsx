"use client";

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Button, Input } from '@/components/ui';
import {
    Search as SearchIcon,
    Filter,
    User,
    History,
    Phone,
    Hash,
    Calendar,
    ChevronRight,
    UserCheck,
    UserMinus,
    GraduationCap
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function SearchPage() {
    const { profile } = useAuth();
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState('Current');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const categories = [
        { label: 'Current Students', icon: UserCheck, id: 'Current' },
        { label: 'Graduated / Alumni', icon: GraduationCap, id: 'Alumni' },
        { label: 'Withdrawn', icon: UserMinus, id: 'Withdrawn' },
    ];

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!profile?.schoolId || !query.trim()) return;

        setLoading(true);
        try {
            const q = query.trim();
            // In a real production app with many students, we'd use a server-side search or Algolia.
            // For now, we fetch all students for this school and filter locally for responsiveness,
            // or perform multiple exact matches if the query is a roll number/mobile.
            const studentSnap = await getDocs(collection(db, 'students'), where('schoolId', '==', profile.schoolId));
            const allStudents = studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
            
            const filtered = allStudents.filter(r =>
                r.name.toLowerCase().includes(q.toLowerCase()) ||
                r.roll?.toString().includes(q) ||
                r.mobile?.includes(q)
            );

            setResults(filtered);
        } catch (error) {
            console.error("Search index error:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredResults = results.filter(r =>
        activeTab === 'Current' ? r.status !== 'Graduated' && r.status !== 'Withdrawn' : r.status === activeTab
    );

    return (
        <DashboardLayout allowedRoles={['principal', 'teacher']}>
            <div className="space-y-6">
                {/* Header & Search Bar */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Global Archive Search</h1>
                        <p className="text-slate-500 font-medium">Query current and historical records across the institution</p>
                    </div>
                        <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20 shadow-md">
                            <SearchIcon className="w-5 h-5" />
                        </div>
                        <Input
                            placeholder="Search by name, roll number..."
                            className="h-16 pl-20 pr-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none focus:border-blue-500 transition-all font-bold text-lg"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </form>
                </div>

                {/* Tab Controls */}
                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 w-fit rounded-2xl border border-slate-200 dark:border-slate-800">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveTab(cat.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === cat.id
                                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <cat.icon className="w-4 h-4" />
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Results Info */}
                <div className="flex items-center justify-between text-xs font-black uppercase text-slate-400 tracking-widest pl-2">
                    <span>{filteredResults.length} records found</span>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-600" /> Exact Matches</span>
                        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-300" /> Historical</span>
                    </div>
                </div>

                {/* Results Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredResults.map((result, i) => (
                        <motion.div
                            key={result.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Link href={`/students/${result.id}`}>
                                <Card className="p-6 hover:shadow-2xl transition-all duration-300 border-slate-100 dark:border-slate-800/50 group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 dark:bg-slate-800/50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />

                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all font-black text-xl">
                                            {result.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 dark:text-white leading-tight underline-offset-4 group-hover:underline">{result.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-[9px] font-black uppercase">
                                                    #{result.roll}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{result.class}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 text-slate-500">
                                                <Phone className="w-4 h-4" />
                                                <span className="text-sm font-medium">{result.mobile}</span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 group-hover:text-blue-600 transition-colors">
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>

                                    {result.status !== 'Current' && (
                                        <div className="mt-4 pt-4 border-t border-dashed border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                            <History className="w-3 h-3 text-slate-400" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Graduated Batch 2024</span>
                                        </div>
                                    )}
                                </Card>
                            </Link>
                        </motion.div>
                    ))}

                    {/* Empty State */}
                    {filteredResults.length === 0 && (
                        <div className="lg:col-span-3 py-20 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-full text-slate-300">
                                <SearchIcon className="w-12 h-12" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">No matches found</h3>
                                <p className="text-slate-500 max-w-sm mx-auto">We couldn't find any student matching "{query}" in our local or historical archives.</p>
                            </div>
                            <Button variant="outline" onClick={() => setQuery('')}>Clear Query</Button>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
