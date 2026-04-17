"use client";

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Button, Input } from '@/components/ui';
import {
    UserPlus,
    Trash2,
    Pencil,
    Mail,
    Shield,
    BookOpen,
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    ShieldAlert,
    Loader2,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    setDoc,
    deleteDoc,
    updateDoc,
    serverTimestamp,
    orderBy
} from 'firebase/firestore';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { initializeApp, deleteApp, getApps } from 'firebase/app';

// Firebase config for secondary app (to create users without logging out principal)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export default function TeacherManagementPage() {
    const { profile } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        email: '',
        password: '',
        class: '10',
        division: 'A'
    });
    const [isEditing, setIsEditing] = useState(false);

    const fetchTeachers = async () => {
        if (!profile?.schoolId) return;
        setLoading(true);

        try {
            const q = query(
                collection(db, 'users'),
                where('schoolId', '==', profile.schoolId),
                where('role', '==', 'teacher'),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            const teacherData = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTeachers(teacherData);
        } catch (err) {
            console.error("Staff fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeachers();
    }, [profile?.schoolId]);

    const handleAddTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.schoolId) return;
        setActionLoading(true);

        let secondaryApp;
        try {
            // Create user in Firebase Auth using a secondary app instance
            // This prevents the current principal user from being logged out
            const appName = `Secondary_${Date.now()}`;
            secondaryApp = initializeApp(firebaseConfig, appName);
            const secondaryAuth = getAuth(secondaryApp);

            const userCredential = await createUserWithEmailAndPassword(
                secondaryAuth,
                formData.email,
                formData.password
            );

            const uid = userCredential.user.uid;

            // Create profile in Firestore
            await setDoc(doc(db, 'users', uid), {
                name: formData.name,
                email: formData.email,
                role: 'teacher',
                class: formData.class,
                division: formData.division,
                schoolId: profile.schoolId,
                status: 'Active',
                createdAt: serverTimestamp()
            });

            // Sign out from secondary auth and delete secondary app
            await signOut(secondaryAuth);

            setIsModalOpen(false);
            resetForm();
            fetchTeachers();
            alert("Teacher account provisioned successfully.");
        } catch (error: any) {
            console.error("Error adding teacher:", error);
            let msg = "Failed to create teacher account.";
            if (error.code === 'auth/email-already-in-use') msg = "This email is already registered in the system.";
            else if (error.message) msg = error.message;
            alert(msg);
        } finally {
            if (secondaryApp) await deleteApp(secondaryApp);
            setActionLoading(false);
        }
    };

    const handleUpdateTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);

        try {
            await updateDoc(doc(db, 'users', formData.id), {
                name: formData.name,
                class: formData.class,
                division: formData.division
            });
            setIsModalOpen(false);
            resetForm();
            fetchTeachers();
            alert("Teacher information updated.");
        } catch (error) {
            console.error("Error updating teacher:", error);
            alert("Update failed.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteTeacher = async (id: string) => {
        if (!confirm("Are you sure? This will remove the teacher's profile from the registry.")) return;

        try {
            await deleteDoc(doc(db, 'users', id));
            fetchTeachers();
            alert("Teacher record purged.");
        } catch (error) {
            console.error("Error purging teacher:", error);
        }
    };

    const toggleTeacherStatus = async (teacher: any) => {
        const newStatus = teacher.status === 'Active' ? 'Disabled' : 'Active';
        try {
            await updateDoc(doc(db, 'users', teacher.id), {
                status: newStatus
            });
            fetchTeachers();
        } catch (error) {
            console.error("Status toggle failed:", error);
        }
    };

    const resetForm = () => {
        setFormData({ id: '', name: '', email: '', password: '', class: '10', division: 'A' });
        setIsEditing(false);
    };

    const openEditModal = (teacher: any) => {
        setFormData({
            id: teacher.id,
            name: teacher.name,
            email: teacher.email,
            password: '', // Don't show password
            class: teacher.class || '10',
            division: teacher.division || 'A'
        });
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const filteredTeachers = teachers.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout allowedRoles={['principal']}>
            <div className="space-y-6 pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Staff Registry</h1>
                        <p className="text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] mt-1">Institutional Resource Management</p>
                    </div>
                    <Button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="gap-2 h-14 px-8 rounded-2xl shadow-2xl shadow-blue-500/20 bg-blue-600 font-black uppercase text-[10px] tracking-widest"
                    >
                        <UserPlus className="w-5 h-5" />
                        Onboard Teacher
                    </Button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <Card className="p-6 flex items-center gap-5 border-slate-100 dark:border-slate-800">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{teachers.length}</p>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Certified Staff</p>
                        </div>
                    </Card>
                    <Card className="p-6 flex items-center gap-5 border-slate-100 dark:border-slate-800">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{teachers.filter(t => t.status === 'Active').length}</p>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Active Portals</p>
                        </div>
                    </Card>
                    <Card className="p-6 flex items-center gap-5 border-slate-100 dark:border-slate-800">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600">
                            <XCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{teachers.filter(t => t.status === 'Disabled').length}</p>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Locked Access</p>
                        </div>
                    </Card>
                </div>

                {/* Search */}
                <Card className="p-2 border-slate-100 dark:border-slate-800 shadow-xl">
                    <div className="relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <Input
                            placeholder="Identify staff by name or institutional email..."
                            className="pl-16 h-14 bg-transparent border-none rounded-none focus:ring-0 text-lg font-bold placeholder:text-slate-300"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </Card>

                {/* Table */}
                <Card className="p-0 overflow-hidden border-slate-100 dark:border-slate-800/50 shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800/60">
                                <tr>
                                    <th className="py-6 px-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Faculty Name</th>
                                    <th className="py-6 px-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Assignment</th>
                                    <th className="py-6 px-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Status</th>
                                    <th className="py-6 px-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-right">Registry Control</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center">
                                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synchronizing Vault...</p>
                                        </td>
                                    </tr>
                                ) : filteredTeachers.map((teacher, i) => (
                                    <motion.tr
                                        key={teacher.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all group"
                                    >
                                        <td className="py-6 px-8">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center font-black text-blue-600 shadow-sm group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                    {teacher.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 dark:text-slate-100">{teacher.name}</p>
                                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{teacher.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-6 px-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400">
                                                    <BookOpen className="w-4 h-4" />
                                                </div>
                                                <span className="font-black text-slate-700 dark:text-slate-300 text-sm tracking-tight">{teacher.class}-{teacher.division}</span>
                                            </div>
                                        </td>
                                        <td className="py-6 px-8">
                                            <button
                                                onClick={() => toggleTeacherStatus(teacher)}
                                                className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${teacher.status === 'Active'
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                                                    : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
                                                    }`}
                                            >
                                                {teacher.status || 'Active'}
                                            </button>
                                        </td>
                                        <td className="py-6 px-8 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-10 h-10 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                                    onClick={() => openEditModal(teacher)}
                                                >
                                                    <Pencil className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-10 h-10 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30"
                                                    onClick={() => handleDeleteTeacher(teacher.id)}
                                                >
                                                    <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-600" />
                                                </Button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Add/Edit Modal */}
                <AnimatePresence>
                    {isModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsModalOpen(false)}
                                className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                                className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl z-10 overflow-hidden border-2 border-white/20"
                            >
                                <form onSubmit={isEditing ? handleUpdateTeacher : handleAddTeacher} className="p-10 space-y-8">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
                                                <UserPlus className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{isEditing ? 'Modify Personnel' : 'Onboard Faculty'}</h3>
                                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-none mt-1">Registry Protocol 2.0</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            title="Close Modal"
                                            aria-label="Close Modal"
                                            className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <Input
                                            label="Faculty Legal Name"
                                            placeholder="e.g. Johnathan Doe"
                                            required
                                            className="h-14 rounded-2xl bg-slate-50/50 border-2 border-slate-100"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                        <Input
                                            label="Institutional Email"
                                            type="email"
                                            placeholder="staff@school.com"
                                            required
                                            disabled={isEditing}
                                            className="h-14 rounded-2xl bg-slate-50/50 border-2 border-slate-100"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Class</label>
                                                <select
                                                    className="w-full h-14 px-6 bg-slate-50/50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 transition-colors font-black text-sm uppercase tracking-tighter"
                                                    value={formData.class}
                                                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                                                    title="Select Class"
                                                >
                                                    {[...Array(12)].map((_, i) => (
                                                        <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Division</label>
                                                <select
                                                    className="w-full h-14 px-6 bg-slate-50/50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 transition-colors font-black text-sm uppercase tracking-tighter"
                                                    value={formData.division}
                                                    onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                                                    title="Select Division"
                                                >
                                                    {['A', 'B', 'C', 'D', 'E'].map(div => (
                                                        <option key={div} value={div}>{div}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        {!isEditing && (
                                            <Input
                                                label="Security Access Key (Password)"
                                                type="password"
                                                placeholder="Min. 8 characters"
                                                required
                                                className="h-14 rounded-2xl bg-slate-50/50 border-2 border-slate-100"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            />
                                        )}
                                    </div>

                                    <div className="pt-4 flex gap-4">
                                        <Button
                                            type="submit"
                                            disabled={actionLoading}
                                            className="h-14 rounded-2xl flex-1 font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-blue-500/20"
                                        >
                                            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isEditing ? 'Sync Changes' : 'Authorize Access')}
                                        </Button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
