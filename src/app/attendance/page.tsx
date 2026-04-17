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
    History,
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
    Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    setDoc,
    doc,
    serverTimestamp,
    Timestamp,
    orderBy,
    limit,
    writeBatch
} from 'firebase/firestore';

type AttendanceStatus = 'present' | 'absent' | 'late';

export default function AttendancePage() {
    const { profile } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Class selection (for principals)
    const [selectedClass, setSelectedClass] = useState('10');
    const [selectedDivision, setSelectedDivision] = useState('A');

    const [students, setStudents] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saveLoading, setSaveLoading] = useState(false);
    
    // Safety Ref to prevent duplicate fetches
    const fetchLock = React.useRef(false);

    // Sync selected class with teacher profile
    useEffect(() => {
        if (profile?.role === 'teacher') {
            setSelectedClass(profile.class || '10');
            setSelectedDivision(profile.division || 'A');
        }
    }, [profile?.schoolId, profile?.class, profile?.division]);

    const fetchStudents = async () => {
        if (!profile?.schoolId || fetchLock.current) return;
        fetchLock.current = true;
        setLoading(true);

        try {
            const targetClass = profile.role === 'teacher' ? (profile.class || '10') : selectedClass;
            const targetDiv = profile.role === 'teacher' ? (profile.division || 'A') : selectedDivision;

            const snap = await getDocs(query(
                collection(db, 'students'),
                where('schoolId', '==', profile.schoolId),
                where('class', '==', targetClass),
                where('division', '==', targetDiv)
            ));
            
            const studentData = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a: any, b: any) => (parseInt(a.roll) || 0) - (parseInt(b.roll) || 0));

            setStudents(studentData);
        } catch (err) {
            console.error("Attendance registry fetch error:", err);
        } finally {
            setLoading(false);
            fetchLock.current = false;
        }
    };

    const fetchHistory = async () => {
        if (!profile?.schoolId) return;
        const targetClass = profile.role === 'teacher' ? profile.class : selectedClass;
        const targetDiv = profile.role === 'teacher' ? profile.division : selectedDivision;

        if (!targetClass || !targetDiv) return;

        try {
            const snapshot = await getDocs(query(
                collection(db, 'attendance'),
                where('schoolId', '==', profile.schoolId),
                where('class', '==', targetClass),
                where('division', '==', targetDiv),
                orderBy('date', 'desc'),
                limit(12)
            ));

            const historyData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: (doc.data().date as Timestamp)?.toDate()
            }));
            setHistory(historyData);
        } catch (err) {
            console.error("History fetch error:", err);
        }
    };

    const fetchDailyStatus = async () => {
        if (!profile?.schoolId || !selectedDate) return;

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const targetClass = profile.role === 'teacher' ? profile.class : selectedClass;
        const targetDiv = profile.role === 'teacher' ? profile.division : selectedDivision;

        if (!targetClass || !targetDiv) return;

        try {
            const snapshot = await getDocs(query(
                collection(db, 'attendance'),
                where('schoolId', '==', profile.schoolId),
                where('class', '==', targetClass),
                where('division', '==', targetDiv),
                where('date', '>=', Timestamp.fromDate(startOfDay)),
                where('date', '<=', Timestamp.fromDate(endOfDay))
            ));

            const records: Record<string, AttendanceStatus> = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                records[data.studentId] = data.status;
            });
            setAttendance(records);
        } catch (err) {
            console.error("Daily status fetch error:", err);
        }
    };

    useEffect(() => {
        if (!profile?.schoolId) return;
        fetchStudents();
        fetchHistory();
        fetchDailyStatus();
    }, [profile?.schoolId, profile?.class, profile?.division, selectedClass, selectedDivision, selectedDate]);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const handleSaveAttendance = async () => {
        if (!profile?.schoolId) return;
        setSaveLoading(true);

        try {
            const dateObj = new Date(selectedDate);
            dateObj.setHours(12, 0, 0, 0);

            const batch = writeBatch(db);
            const targetClass = profile.role === 'teacher' ? profile.class : selectedClass;
            const targetDiv = profile.role === 'teacher' ? profile.division : selectedDivision;

            students.forEach(student => {
                const status = attendance[student.id] || 'absent';
                const docId = `${student.id}_${selectedDate}`;
                const docRef = doc(db, 'attendance', docId);

                batch.set(docRef, {
                    studentId: student.id,
                    studentName: student.name,
                    rollNumber: student.roll || '',
                    class: targetClass,
                    division: targetDiv,
                    date: Timestamp.fromDate(dateObj),
                    status: status,
                    schoolId: profile.schoolId,
                    recordedBy: profile.uid,
                    lastUpdated: serverTimestamp()
                }, { merge: true });
            });

            await batch.commit();
            fetchHistory();
            alert(`Attendance for Class ${targetClass}-${targetDiv} synced!`);
        } catch (error) {
            console.error("Error saving attendance:", error);
            alert("Failed to sync attendance. Check console for details.");
        } finally {
            setSaveLoading(false);
        }
    };

    const stats = {
        present: Object.values(attendance).filter(v => v === 'present').length,
        absent: Object.values(attendance).filter(v => v === 'absent').length,
        late: Object.values(attendance).filter(v => v === 'late').length,
        unmarked: students.length - Object.keys(attendance).length,
        total: students.length,
    };

    const chartData = [
        { name: 'Present', value: stats.present, color: '#10b981' },
        { name: 'Absent', value: stats.absent, color: '#ef4444' },
        { name: 'Late', value: stats.late, color: '#f59e0b' },
    ];

    return (
        <DashboardLayout allowedRoles={['teacher', 'principal']}>
            <div className="space-y-6 pb-20">
                {/* Top Navigation & Status */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Institutional Attendance</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
                                    Class {profile?.role === 'teacher' ? `${profile.class}-${profile.division}` : `${selectedClass}-${selectedDivision}`}
                                </span>
                                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-none">• Registry v2.0</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {profile?.role === 'principal' && (
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <Filter className="w-4 h-4 text-slate-400 ml-2" />
                                <select
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    className="bg-transparent border-none text-xs font-black uppercase outline-none cursor-pointer"
                                    title="Select Class"
                                >
                                    {[...Array(12)].map((_, i) => (
                                        <option key={i + 1} value={String(i + 1)}>Class {i + 1}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedDivision}
                                    onChange={(e) => setSelectedDivision(e.target.value)}
                                    className="bg-transparent border-none text-xs font-black uppercase outline-none cursor-pointer border-l border-slate-100 dark:border-slate-800 ml-2 pl-2"
                                    title="Select Division"
                                >
                                    {['A', 'B', 'C', 'D', 'E'].map(div => (
                                        <option key={div} value={div}>Div {div}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <Card className="flex items-center gap-2 p-2 border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 px-2 font-black text-slate-700 dark:text-slate-200">
                                <CalendarIcon className="w-4 h-4 text-blue-600" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    title="Select Date"
                                    className="bg-transparent border-none outline-none font-black text-sm uppercase cursor-pointer"
                                />
                            </div>
                        </Card>

                        <Button
                            onClick={handleSaveAttendance}
                            disabled={saveLoading || students.length === 0}
                            className="gap-2 h-12 px-6 rounded-xl shadow-lg shadow-blue-500/20 font-black uppercase text-[10px] tracking-widest"
                        >
                            {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Sync Ledger
                        </Button>
                    </div>
                </div>

                {/* Performance Analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <Card className="hidden lg:flex flex-col items-center justify-center p-6 text-center border-slate-100 dark:border-slate-800">
                        <div className="relative w-32 h-32">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        innerRadius={45}
                                        outerRadius={60}
                                        dataKey="value"
                                        stroke="none"
                                        paddingAngle={5}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <p className="text-xl font-black text-slate-900 dark:text-white">
                                    {stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%
                                </p>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter leading-none mt-1">Presence</p>
                            </div>
                        </div>
                    </Card>

                    <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="p-5 border-none bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 transition-transform hover:scale-[1.02]">
                            <CheckCircle2 className="w-6 h-6 opacity-40 mb-3" />
                            <p className="text-2xl font-black">{stats.present}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Present</p>
                        </Card>
                        <Card className="p-5 border-none bg-red-600 text-white shadow-xl shadow-red-500/20 transition-transform hover:scale-[1.02]">
                            <XCircle className="w-6 h-6 opacity-40 mb-3" />
                            <p className="text-2xl font-black">{stats.absent}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Absent</p>
                        </Card>
                        <Card className="p-5 border-none bg-amber-500 text-white shadow-xl shadow-amber-500/20 transition-transform hover:scale-[1.02]">
                            <Clock className="w-6 h-6 opacity-40 mb-3" />
                            <p className="text-2xl font-black">{stats.late}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Late Arrival</p>
                        </Card>
                        <Card className="p-5 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 transition-transform hover:scale-[1.02]">
                            <Users className="w-6 h-6 text-blue-600 mb-3" />
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Batch</p>
                        </Card>
                    </div>
                </div>

                {/* Enrollment Table */}
                <Card className="p-0 overflow-hidden border-slate-100 dark:border-slate-800/50 shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 font-black text-slate-400 uppercase text-[9px] tracking-[0.2em]">
                                <tr>
                                    <th className="py-6 px-8">Identity</th>
                                    <th className="py-6 px-8 text-center">Current Status</th>
                                    <th className="py-6 px-8 text-right">Action Protocol</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={3} className="py-24 text-center">
                                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 antialiased">Synchronizing Class Records...</p>
                                        </td>
                                    </tr>
                                ) : students.length > 0 ? (
                                    students.map((student, i) => (
                                        <motion.tr
                                            key={student.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all"
                                        >
                                            <td className="py-6 px-8">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center font-black group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all text-slate-400 shadow-sm">
                                                        {student.roll || i + 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 dark:text-slate-100 antialiased leading-none">{student.name}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 opacity-60">Secondary Contact Verified</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-6 px-8 text-center">
                                                <AnimatePresence mode="wait">
                                                    {!attendance[student.id] ? (
                                                        <motion.span
                                                            key="unmarked"
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            className="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[9px] font-black uppercase tracking-widest"
                                                        >
                                                            Unmarked
                                                        </motion.span>
                                                    ) : (
                                                        <motion.span
                                                            key={attendance[student.id]}
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${attendance[student.id] === 'present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                    attendance[student.id] === 'absent' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                        'bg-amber-50 text-amber-600 border-amber-100'
                                                                }`}
                                                        >
                                                            {attendance[student.id]}
                                                        </motion.span>
                                                    )}
                                                </AnimatePresence>
                                            </td>
                                            <td className="py-6 px-8">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleStatusChange(student.id, 'present')}
                                                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${attendance[student.id] === 'present'
                                                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 scale-110'
                                                                : 'bg-slate-50 dark:bg-slate-900 text-slate-300 hover:text-emerald-500 border border-slate-100 dark:border-slate-800'
                                                            }`}
                                                    >
                                                        <Check className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(student.id, 'late')}
                                                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${attendance[student.id] === 'late'
                                                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/40 scale-110'
                                                                : 'bg-slate-50 dark:bg-slate-900 text-slate-300 hover:text-amber-500 border border-slate-100 dark:border-slate-800'
                                                            }`}
                                                    >
                                                        <Clock className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(student.id, 'absent')}
                                                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${attendance[student.id] === 'absent'
                                                                ? 'bg-red-600 text-white shadow-lg shadow-red-500/40 scale-110'
                                                                : 'bg-slate-50 dark:bg-slate-900 text-slate-300 hover:text-red-500 border border-slate-100 dark:border-slate-800'
                                                            }`}
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="py-32 text-center">
                                            <div className="max-w-xs mx-auto space-y-4">
                                                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] flex items-center justify-center text-slate-200 mx-auto">
                                                    <Users className="w-10 h-10" />
                                                </div>
                                                <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest antialiased">No students found for Class {profile?.role === 'teacher' ? `${profile.class}-${profile.division}` : `${selectedClass}-${selectedDivision}`}</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Class Ledger History */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <History className="w-5 h-5 text-blue-600" />
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">Class Ledger History</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {history.map((record, i) => (
                            <motion.div
                                key={record.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <Card className="p-4 border-slate-100 dark:border-slate-800/50 hover:border-blue-200 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${record.status === 'present' ? 'bg-emerald-50 text-emerald-600' :
                                                record.status === 'absent' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                            }`}>
                                            {record.status === 'present' ? <Check className="w-4 h-4" /> :
                                                record.status === 'absent' ? <X className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                        </div>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                            {record.date?.toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="font-black text-slate-900 dark:text-white text-sm leading-tight line-clamp-1">{record.studentName}</p>
                                    <p className="text-[9px] font-black uppercase text-slate-400 mt-1 opacity-70">Roll #{record.rollNumber || '?'}</p>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Float Action for Tablet/Mobile */}
            <div className="fixed bottom-8 right-8 lg:hidden z-30">
                <Button
                    onClick={handleSaveAttendance}
                    disabled={saveLoading || students.length === 0}
                    className="w-16 h-16 rounded-3xl shadow-2xl bg-blue-600 flex items-center justify-center p-0 transition-transform active:scale-95 border-4 border-white dark:border-slate-950"
                >
                    {saveLoading ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : <Save className="w-6 h-6 text-white" />}
                </Button>
            </div>
        </DashboardLayout>
    );
}
