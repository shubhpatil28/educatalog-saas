"use client";

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Button, cn } from '@/components/ui';
import {
    FileSpreadsheet,
    FileDown,
    Loader2,
    TrendingUp,
    BarChart3,
    Calendar,
    Download
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    Timestamp
} from 'firebase/firestore';
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function ReportsPage() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [reportData, setReportData] = useState<any[]>([]);
    const [classSummary, setClassSummary] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const years = [2024, 2025, 2026, 2027];

    useEffect(() => {
        if (profile?.schoolId) {
            fetchReportData();
        }
    }, [profile?.schoolId, selectedMonth, selectedYear]);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const schoolId = profile?.schoolId;

            // 1. Fetch Students
            const studentsQuery = query(
                collection(db, 'students'),
                where('schoolId', '==', schoolId)
            );
            const studentsSnapshot = await getDocs(studentsQuery);
            const studentsList = studentsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // 2. Fetch Attendance for the month
            const startOfMonth = new Date(selectedYear, selectedMonth, 1);
            const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

            const attendanceQuery = query(
                collection(db, 'attendance'),
                where('schoolId', '==', schoolId),
                where('date', '>=', Timestamp.fromDate(startOfMonth)),
                where('date', '<=', Timestamp.fromDate(endOfMonth))
            );

            const attendanceSnapshot = await getDocs(attendanceQuery);
            const attendanceRecords = attendanceSnapshot.docs.map(doc => doc.data());

            // 3. Process Data for Students Table
            const processedData = studentsList.map((student: any) => {
                const studentAttendance = attendanceRecords.filter(r => r.studentId === student.id);
                const present = studentAttendance.filter(r => r.status === 'present').length;
                const absent = studentAttendance.filter(r => r.status === 'absent').length;
                const total = present + absent;
                const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : "0.0";

                return {
                    name: student.name,
                    roll: student.roll,
                    class: student.class,
                    present,
                    absent,
                    percentage
                };
            }).sort((a, b) => (a.class > b.class ? 1 : -1) || a.roll - b.roll);

            setReportData(processedData);

            // 4. Process Class-wise Summary
            const classesMap: Record<string, { present: number, absent: number }> = {};
            processedData.forEach(item => {
                if (!classesMap[item.class]) {
                    classesMap[item.class] = { present: 0, absent: 0 };
                }
                classesMap[item.class].present += item.present;
                classesMap[item.class].absent += item.absent;
            });

            const classSummaryData = Object.entries(classesMap).map(([className, counts]) => {
                const total = counts.present + counts.absent;
                return {
                    name: className,
                    attendance: total > 0 ? parseFloat(((counts.present / total) * 100).toFixed(1)) : 0
                };
            });

            setClassSummary(classSummaryData);

            // 5. Process Trend Data
            const trendMap: Record<number, { present: number, total: number }> = {};
            attendanceRecords.forEach(r => {
                const day = r.date.toDate().getDate();
                if (!trendMap[day]) trendMap[day] = { present: 0, total: 0 };
                if (r.status === 'present') trendMap[day].present++;
                trendMap[day].total++;
            });

            const sortedTrend = Object.entries(trendMap)
                .map(([day, counts]) => ({
                    day: `${day}`,
                    attendance: counts.total > 0 ? parseFloat(((counts.present / counts.total) * 100).toFixed(1)) : 0
                }))
                .sort((a, b) => parseInt(a.day) - parseInt(b.day));

            setTrendData(sortedTrend);

        } catch (error) {
            console.error("Error fetching report data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Institutional Attendance Report", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Period: ${months[selectedMonth]} ${selectedYear}`, 14, 30);
        doc.text(`Generation Date: ${new Date().toLocaleDateString()}`, 14, 36);

        const tableColumn = ["Roll No", "Student Name", "Class", "Present", "Absent", "Attendance %"];
        const tableRows = reportData.map(student => [
            student.roll,
            student.name,
            student.class,
            student.present,
            student.absent,
            `${student.percentage}%`
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 9 }
        });

        doc.save(`Attendance_Report_${months[selectedMonth]}_${selectedYear}.pdf`);
    };

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(reportData.map(s => ({
            "Roll No": s.roll,
            "Student Name": s.name,
            "Class": s.class,
            "Present": s.present,
            "Absent": s.absent,
            "Attendance Percentage": s.percentage + "%"
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
        XLSX.writeFile(workbook, `Attendance_Report_${months[selectedMonth]}_${selectedYear}.xlsx`);
    };

    return (
        <DashboardLayout allowedRoles={['principal']}>
            <div className="space-y-6 pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Institutional Reports</h1>
                        <p className="text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] mt-1">SaaS Analytics Engine • Session 2026-27</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="bg-transparent border-none outline-none font-black text-xs uppercase cursor-pointer text-slate-700 dark:text-slate-200"
                            >
                                {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 px-4 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 border-none">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="bg-transparent border-none outline-none font-black text-xs uppercase cursor-pointer text-slate-700 dark:text-slate-200"
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Export Control Card */}
                <Card className="p-1.5 bg-gradient-to-r from-blue-600 to-indigo-700 border-none shadow-2xl shadow-blue-500/20">
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md">
                                <FileDown className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-white font-black text-sm">{reportData.length} records processed</p>
                                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Active Archives Ready</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Button
                                onClick={handleExportPDF}
                                className="flex-1 sm:flex-none h-12 px-6 bg-white/10 hover:bg-white/20 text-white border-white/20 font-black uppercase text-[10px] tracking-widest rounded-xl"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download PDF
                            </Button>
                            <Button
                                onClick={handleExportExcel}
                                className="flex-1 sm:flex-none h-12 px-6 bg-white text-blue-600 hover:bg-slate-100 font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl"
                            >
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                Export Excel
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Visualizations Layer */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-8 group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-10 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            Daily Participation Trend
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="day"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                                        label={{ value: 'Day of Month', position: 'insideBottom', offset: -5, fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                                        labelStyle={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '10px', color: '#64748b', marginBottom: '4px' }}
                                    />
                                    <Area type="monotone" dataKey="attendance" stroke="#3b82f6" strokeWidth={4} fill="url(#colorTrend)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className="p-8 group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-10 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-indigo-600" />
                            Class-wise Comparison
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={classSummary}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                                    <Bar dataKey="attendance" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40}>
                                        {classSummary.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#8b5cf6'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* Comprehensive Ledger Table */}
                <Card className="p-0 overflow-hidden border-slate-100 dark:border-slate-800/50 shadow-xl">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/20">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Engagement Ledger</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Detailed month-to-date performance summary</p>
                        </div>
                        <div className="px-5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl text-[10px] font-black uppercase tracking-widest text-blue-600 shadow-sm self-start sm:self-auto">
                            {reportData.length} ACTIVE RECORDS
                        </div>
                    </div>
                    <div className="overflow-x-auto text-[13px]">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800/60">
                                <tr>
                                    <th className="py-6 px-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Roll No</th>
                                    <th className="py-6 px-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Student Name</th>
                                    <th className="py-6 px-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Class</th>
                                    <th className="py-6 px-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-emerald-600">Present</th>
                                    <th className="py-6 px-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-red-500">Absent</th>
                                    <th className="py-6 px-8 text-right text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Attendance %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="py-32 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Synthesizing Archives...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : reportData.length > 0 ? (
                                    reportData.map((student, i) => (
                                        <motion.tr
                                            key={i}
                                            initial={{ opacity: 0, x: -5 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.01 }}
                                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors group"
                                        >
                                            <td className="py-5 px-8 font-bold text-slate-400 italic">#{student.roll}</td>
                                            <td className="py-5 px-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-[14px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-500 border border-slate-200 dark:border-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-all text-xs">
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    <span className="font-black text-slate-900 dark:text-white">{student.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-8 font-black text-slate-500 uppercase text-[11px] tracking-tighter">{student.class}</td>
                                            <td className="py-5 px-8">
                                                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg font-black">{student.present}</span>
                                            </td>
                                            <td className="py-5 px-8">
                                                <span className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg font-black">{student.absent}</span>
                                            </td>
                                            <td className="py-4 px-8 text-right">
                                                <div className="inline-flex items-center gap-4 px-5 py-2.5 rounded-[18px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm group-hover:border-blue-500/30 transition-all">
                                                    <div className="flex flex-col items-end">
                                                        <span className={cn(
                                                            "text-[15px] font-black tracking-tighter",
                                                            parseFloat(student.percentage) < 75 ? 'text-amber-500 shadow-amber-500/10' : 'text-blue-600 shadow-blue-500/10'
                                                        )}>
                                                            {student.percentage}%
                                                        </span>
                                                        <div className="w-12 h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                                                            <div
                                                                className={cn("progress-bar-fill h-full", parseFloat(student.percentage) < 75 ? 'bg-amber-500' : 'bg-blue-600')}
                                                                style={{ '--progress-width': `${student.percentage}%` } as React.CSSProperties}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-40">
                                                <BarChart3 className="w-16 h-16 text-slate-300" />
                                                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Void Archives: No data found for period</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
}
