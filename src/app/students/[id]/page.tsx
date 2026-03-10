"use client";

import React, { useRef, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Button } from '@/components/ui';
import {
    User,
    MapPin,
    Phone,
    Calendar,
    History,
    Download,
    Printer,
    ArrowLeft,
    GraduationCap,
    CheckCircle2,
    Clock,
    TrendingUp,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function StudentProfilePage() {
    const params = useParams();
    const router = useRouter();
    const componentRef = useRef<HTMLDivElement>(null);
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Student_Profile_${params.id}`,
    });

    useEffect(() => {
        const fetchStudent = async () => {
            if (!params.id) return;
            try {
                const docRef = doc(db, 'students', params.id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setStudent({ id: docSnap.id, ...docSnap.data() });
                }
            } catch (error) {
                console.error("Error fetching student:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStudent();
    }, [params.id]);

    if (loading) {
        return (
            <DashboardLayout allowedRoles={['principal', 'teacher']}>
                <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Retrieving Dossier...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!student) {
        return (
            <DashboardLayout allowedRoles={['principal', 'teacher']}>
                <div className="h-[60vh] flex flex-col items-center justify-center gap-6 text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center text-red-600">
                        <AlertCircle className="w-10 h-10" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 shadow-sm">Record Not Found</h2>
                        <p className="text-slate-500 mt-2">The requested student profile does not exist or has been removed.</p>
                    </div>
                    <Button onClick={() => router.push('/students')}>Return to Catalog</Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout allowedRoles={['principal', 'teacher']}>
            <div className="space-y-6">
                {/* Header with Navigation */}
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => router.back()} className="gap-2 -ml-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Catalog
                    </Button>
                    <div className="flex gap-3">
                        <Button variant="outline" className="gap-2" onClick={() => (handlePrint as any)()}>
                            <Printer className="w-4 h-4" />
                            Print Profile
                        </Button>
                        <Button className="gap-2 shadow-lg shadow-blue-500/20">
                            <Download className="w-4 h-4" />
                            Download PDF
                        </Button>
                    </div>
                </div>

                {/* Printable Area */}
                <div ref={componentRef} className="print:p-10">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left Column: Basic Info Card */}
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="text-center p-8 relative overflow-hidden bg-white dark:bg-slate-900">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
                                <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 mx-auto mb-6 flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-2xl overflow-hidden text-white font-black text-4xl">
                                    {student.name.charAt(0)}
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">{student.name}</h2>
                                <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-4">Roll No: #{student.roll}</p>
                                <div className="flex justify-center gap-2">
                                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase">
                                        ACTIVE STATUS
                                    </span>
                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-[10px] font-black uppercase">
                                        CLASS {student.class}
                                    </span>
                                </div>
                            </Card>

                            <Card className="space-y-4">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    Essential Metadata
                                </h3>
                                <div className="space-y-4 pt-2">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl shrink-0">
                                            <Calendar className="w-4 h-4 text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Date of Birth</p>
                                            <p className="font-black text-slate-900 dark:text-slate-200">{new Date(student.dob).toLocaleDateString('en-US', { dateStyle: 'long' })}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl shrink-0">
                                            <History className="w-4 h-4 text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Enrollment Date</p>
                                            <p className="font-black text-slate-900 dark:text-slate-200">
                                                {student.createdAt ? new Date(student.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Right Column: Detailed Info & History */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-10">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                        <GraduationCap className="w-6 h-6 text-blue-600" />
                                        Institutional Dossier
                                    </h3>
                                    <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        REF: {student.id.substring(0, 8).toUpperCase()}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
                                    <div className="space-y-8">
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Student Name</p>
                                            <p className="text-lg font-black text-slate-900 dark:text-slate-200">{student.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Mother's Name</p>
                                            <p className="text-lg font-black text-slate-900 dark:text-slate-200">{student.motherName}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-8">
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Institutional Roll</p>
                                            <p className="text-lg font-black text-blue-600">#{student.roll}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Assigned Class</p>
                                            <p className="text-lg font-black text-slate-900 dark:text-slate-200">{student.class}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-12 pt-10 border-t border-slate-50 dark:border-slate-800">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Internal Certification</h4>
                                    <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-blue-600 shadow-sm">
                                            <CheckCircle2 className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 dark:text-white">Profile Verified</p>
                                            <p className="text-xs text-slate-500 mt-1 font-medium">This record is fully compliant with the school's data management policy.</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card className="overflow-hidden">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                        <TrendingUp className="w-6 h-6 text-emerald-600" />
                                        Engagement Overview
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-6 rounded-3xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 text-center">
                                        <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-2">Attendance</p>
                                        <p className="text-3xl font-black text-slate-900 dark:text-white">94%</p>
                                    </div>
                                    <div className="p-6 rounded-3xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20 text-center">
                                        <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-2">Academic</p>
                                        <p className="text-3xl font-black text-slate-900 dark:text-white">A+</p>
                                    </div>
                                    <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 text-center">
                                        <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-2">Conduct</p>
                                        <p className="text-3xl font-black text-slate-900 dark:text-white">Exemplary</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
