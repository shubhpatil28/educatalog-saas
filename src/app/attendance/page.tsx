"use client";

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Button, Input } from '@/components/ui';
import {
    Check,
    X,
    Save,
    Calendar as CalendarIcon,
    Users,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    TrendingDown,
    TrendingUp,
    History,
    Loader2,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    onSnapshot,
    getDocs,
    setDoc,
    doc,
    serverTimestamp,
    orderBy,
    limit,
    Timestamp
} from 'firebase/firestore';

export default function AttendancePage() {
    const { profile } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [students, setStudents] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saveLoading, setSaveLoading] = useState(false);

    // Fetch students
    useEffect(() => {
        if (!profile?.schoolId) return;

        const q = query(
            collection(db, 'students'),
            where('schoolId', '==', profile.schoolId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const studentData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setStudents(studentData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.schoolId]);

    // Fetch attendance for selected date
    useEffect(() => {
        if (!profile?.schoolId || !selectedDate) return;

        const fetchAttendance = async () => {
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            const q = query(
                collection(db, 'attendance'),
                where('schoolId', '==', profile.schoolId),
                where('date', '>=', Timestamp.fromDate(startOfDay)),
                where('date', '<=', Timestamp.fromDate(endOfDay))
            );

            const snapshot = await getDocs(q);
            const records: Record<string, 'present' | 'absent'> = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                records[data.studentId] = data.status;
            });
            setAttendance(records);
        };

        fetchAttendance();
    }, [profile?.schoolId, selectedDate]);

    // Fetch history
    useEffect(() => {
        if (!profile?.schoolId) return;

        const q = query(
            collection(db, 'attendance'),
            where('schoolId', '==', profile.schoolId),
            orderBy('date', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const historyData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate()
            }));
            setHistory(historyData);
        });

        return () => unsubscribe();
    }, [profile?.schoolId]);

    const handleToggle = (studentId: string, status: 'present' | 'absent') => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: prev[studentId] === status ? 'absent' : status // Default to absent if unselected
        }));
    };

    const handleSaveAttendance = async () => {
        if (!profile?.schoolId) return;
        setSaveLoading(true);

        try {
            const dateObj = new Date(selectedDate);
            dateObj.setHours(12, 0, 0, 0); // Set to noon to avoid timezone shift issues for the "day"

            const promises = students.map(student => {
                const status = attendance[student.id] || 'absent';
                const docId = `${student.id}_${selectedDate}`;

                return setDoc(doc(db, 'attendance', docId), {
                    studentId: student.id,
                    studentName: student.name,
                    class: student.class,
                    date: Timestamp.fromDate(dateObj),
                    status: status,
                    schoolId: profile.schoolId,
                    lastUpdated: serverTimestamp()
                }, { merge: true });
            });

            await Promise.all(promises);
            alert("Attendance synchronized successfully!");
        } catch (error) {
            console.error("Error saving attendance:", error);
            alert("Failed to synchronize attendance logs.");
        } finally {
            setSaveLoading(false);
        }
    };

    const stats = {
        present: Object.values(attendance).filter(v => v === 'present').length,
        absent: students.length - Object.values(attendance).filter(v => v === 'present').length,
        total: students.length,
    };

    const chartData = [
        { name: 'Present', value: stats.present, color: '#10b981' },
        { name: 'Absent', value: stats.absent, color: '#ef4444' },
    ];

    return (
        <DashboardLayout allowedRoles={['teacher']}>
            <div className="space-y-6">
                {/* Header & Date Selector */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Daily Attendance</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 uppercase text-xs tracking-[0.2em]">Institutional Registry • Session 2026-27</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Card className="flex items-center gap-2 p-2 border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 px-2 font-black text-slate-700 dark:text-slate-200">
                                <CalendarIcon className="w-4 h-4 text-blue-600" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    title="Select Attendance Date"
                                    aria-label="Select Attendance Date"
                                    className="bg-transparent border-none outline-none font-black text-sm uppercase cursor-pointer"
                                />
                            </div>
                        </Card>
                        <Button
                            onClick={handleSaveAttendance}
                            disabled={saveLoading}
                            className="gap-2 h-12 px-6 rounded-xl shadow-lg shadow-blue-500/20"
                        >
                            {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Sync Attendance
                        </Button>
                    </div>
                </div>

                {/* Analytics Top Row */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <Card className="lg:col-span-1 flex flex-col items-center justify-center p-6 text-center">
                        <div className="relative w-40 h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        innerRadius={50}
                                        outerRadius={70}
                                        dataKey="value"
                                        stroke="none"
                                        paddingAngle={5}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <p className="text-2xl font-black text-slate-900 dark:text-white">
                                    {stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%
                                </p>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Engagement</p>
                            </div>
                        </div>
                    </Card>

                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 border-none shadow-xl shadow-blue-500/10 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                            <div className="relative z-10 space-y-4">
                                <CheckCircle2 className="w-8 h-8 text-white/40" />
                                <div>
                                    <p className="text-white text-3xl font-black">{stats.present}</p>
                                    <p className="text-white/60 font-medium uppercase tracking-widest text-[10px]">Students Present Today</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20">
                            <XCircle className="w-8 h-8 text-red-600 mb-6" />
                            <div>
                                <h4 className="text-2xl font-black text-slate-900 dark:text-white">{stats.absent}</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Students Absent Today</p>
                            </div>
                        </Card>

                        <Card className="p-6 bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800">
                            <Users className="w-8 h-8 text-blue-600 mb-6" />
                            <div>
                                <h4 className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Students Enrolled</p>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Student List */}
                <Card className="p-0 overflow-hidden border-slate-100 dark:border-slate-800/50">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="py-5 px-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Roll No.</th>
                                    <th className="py-5 px-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Student Name</th>
                                    <th className="py-5 px-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Class</th>
                                    <th className="py-5 px-6 text-right text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Attendance Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center">
                                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compiling Records...</p>
                                        </td>
                                    </tr>
                                ) : students.length > 0 ? (
                                    students.map((student, i) => (
                                        <motion.tr
                                            key={student.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                                        >
                                            <td className="py-5 px-6 font-bold text-slate-400">#{student.roll}</td>
                                            <td className="py-5 px-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold border border-slate-200 dark:border-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    <p className="font-black text-slate-900 dark:text-slate-100">{student.name}</p>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-sm font-bold text-slate-600">{student.class}</td>
                                            <td className="py-5 px-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleToggle(student.id, 'present')}
                                                        className={`h-11 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 border-2 ${attendance[student.id] === 'present'
                                                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-emerald-500 hover:text-emerald-500'
                                                            }`}
                                                    >
                                                        {attendance[student.id] === 'present' && <Check className="w-3 h-3" />}
                                                        Present
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggle(student.id, 'absent')}
                                                        className={`h-11 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 border-2 ${attendance[student.id] === 'absent'
                                                            ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20'
                                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-red-500 hover:text-red-500'
                                                            }`}
                                                    >
                                                        {attendance[student.id] === 'absent' && <X className="w-3 h-3" />}
                                                        Absent
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center">
                                            <p className="text-slate-500 font-bold">No students found for this institution.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* History Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <History className="w-5 h-5 text-blue-600" />
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">Recent Logs</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {history.map((record, i) => (
                            <motion.div
                                key={record.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <Card className="p-4 flex items-center justify-between border-slate-100 dark:border-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${record.status === 'present' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            {record.status === 'present' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 dark:text-white text-sm leading-none">{record.studentName}</p>
                                            <p className="text-[10px] font-black text-slate-400 mt-1 uppercase">
                                                {record.date?.toLocaleDateString()} • Class {record.class}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${record.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {record.status}
                                    </span>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sticky Save Button for Mobile */}
            <div className="fixed bottom-6 right-6 md:hidden">
                <Button
                    onClick={handleSaveAttendance}
                    disabled={saveLoading}
                    className="w-14 h-14 rounded-full shadow-2xl bg-blue-600 flex items-center justify-center p-0"
                >
                    {saveLoading ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : <Save className="w-6 h-6 text-white" />}
                </Button>
            </div>
        </DashboardLayout>
    );
}
