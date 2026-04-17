"use client";

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Button, Input } from '@/components/ui';
import { 
    UserSquare2, 
    Search, 
    MoreVertical, 
    Check, 
    X, 
    ShieldAlert, 
    Loader2,
    Settings2,
    Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { 
    collection, 
    query, 
    where, 
    onSnapshot, 
    doc, 
    updateDoc,
    getDocs
} from 'firebase/firestore';

export default function FacultyManagement() {
    const { profile } = useAuth();
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // UI State
    const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
    const [editClass, setEditClass] = useState('');
    const [editDiv, setEditDiv] = useState('');
    const [saveLoading, setSaveLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTeachers = async () => {
        if (!profile?.schoolId) return;
        setLoading(true);

        try {
            const q = query(
                collection(db, 'users'),
                where('schoolId', '==', profile.schoolId),
                where('role', '==', 'teacher')
            );
            const snap = await getDocs(q);
            const faculty = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTeachers(faculty);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeachers();
    }, [profile?.schoolId]);

    const handleAssign = async (teacher: any) => {
        if (!profile?.schoolId) return;
        if (!editClass || !editDiv) {
            setError("Class and Division are required.");
            return;
        }

        setSaveLoading(true);
        setError(null);

        try {
            // Check if another teacher is already assigned to this class+div
            const classQuery = query(
                collection(db, 'users'),
                where('schoolId', '==', profile.schoolId),
                where('class', '==', editClass),
                where('division', '==', editDiv),
                where('role', '==', 'teacher')
            );
            
            const existingMapping = await getDocs(classQuery);
            const otherTeachers = existingMapping.docs.filter(d => d.id !== teacher.id);

            if (otherTeachers.length > 0) {
                const other = otherTeachers[0].data();
                setError(`Class ${editClass}-${editDiv} is already assigned to ${other.name || 'another teacher'}.`);
                setSaveLoading(false);
                return;
            }

            // Perform Update
            await updateDoc(doc(db, 'users', teacher.id), {
                class: editClass,
                division: editDiv
            });

            setEditingTeacherId(null);
            setEditClass('');
            setEditDiv('');
            fetchTeachers();
        } catch (err: any) {
            console.error(err);
            setError("Failed to update teacher assignment.");
        } finally {
            setSaveLoading(false);
        }
    };

    const filteredTeachers = teachers.filter(t => 
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout allowedRoles={['principal']}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Faculty Management</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
                                {teachers.length} Active Teachers
                            </span>
                            <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">• Institutional Directory</span>
                        </div>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input 
                            placeholder="Search by name or email..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 h-12 w-full md:w-80 rounded-2xl bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="py-24 text-center">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Fetching Faculty Ledger...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTeachers.map((teacher, index) => (
                            <motion.div
                                key={teacher.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-slate-400 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
                                                {teacher.name?.[0] || teacher.email[0].toUpperCase()}
                                            </div>
                                            <div className="flex flex-col items-end">
                                                {teacher.class && teacher.division ? (
                                                    <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-lg">
                                                        Assigned: {teacher.class}-{teacher.division}
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-widest rounded-lg">
                                                        Unassigned
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-1 mb-6">
                                            <h3 className="font-black text-slate-900 dark:text-white leading-tight">{teacher.name || 'Pending Name'}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{teacher.email}</p>
                                        </div>

                                        <AnimatePresence mode="wait">
                                            {editingTeacherId === teacher.id ? (
                                                <motion.div 
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-800"
                                                >
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Class</label>
                                                            <select 
                                                                className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-xs font-black outline-none px-3"
                                                                value={editClass}
                                                                onChange={(e) => setEditClass(e.target.value)}
                                                            >
                                                                <option value="">Select</option>
                                                                {[...Array(12)].map((_, i) => (
                                                                    <option key={i+1} value={String(i+1)}>{i+1}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Div</label>
                                                            <select 
                                                                className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-xs font-black outline-none px-3"
                                                                value={editDiv}
                                                                onChange={(e) => setEditDiv(e.target.value)}
                                                            >
                                                                <option value="">Select</option>
                                                                {['A', 'B', 'C', 'D', 'E'].map(div => (
                                                                    <option key={div} value={div}>{div}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {error && editingTeacherId === teacher.id && (
                                                        <p className="text-[9px] font-bold text-red-500 flex items-center gap-1">
                                                            <ShieldAlert className="w-3 h-3" />
                                                            {error}
                                                        </p>
                                                    )}

                                                    <div className="flex gap-2">
                                                        <Button 
                                                            className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-[10px] font-black uppercase tracking-wider gap-2"
                                                            onClick={() => handleAssign(teacher)}
                                                            disabled={saveLoading}
                                                        >
                                                            {saveLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                            Confirm
                                                        </Button>
                                                        <Button 
                                                            variant="outline"
                                                            className="h-10 w-10 p-0 rounded-xl border-slate-200 dark:border-slate-700"
                                                            onClick={() => {
                                                                setEditingTeacherId(null);
                                                                setError(null);
                                                            }}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                <Button 
                                                    className="w-full h-11 rounded-xl bg-slate-900 border-none text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors gap-2"
                                                    onClick={() => {
                                                        setEditingTeacherId(teacher.id);
                                                        setEditClass(teacher.class || '');
                                                        setEditDiv(teacher.division || '');
                                                    }}
                                                >
                                                    <Settings2 className="w-4 h-4" />
                                                    Reassign Division
                                                </Button>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
