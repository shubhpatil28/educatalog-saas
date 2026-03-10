"use client";

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Button, Input } from '@/components/ui';
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    Calendar,
    GraduationCap,
    User,
    AlertCircle,
    X,
    Loader2,
    Eye,
    ChevronRight,
    Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    where,
    serverTimestamp,
    orderBy
} from 'firebase/firestore';

export default function StudentCatalogPage() {
    const { profile } = useAuth();
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [studentToDelete, setStudentToDelete] = useState<any>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        roll: '',
        class: '',
        motherName: '',
        dob: ''
    });

    // Fetch students from Firestore
    useEffect(() => {
        if (!profile?.schoolId) return;

        const q = query(
            collection(db, 'students'),
            where('schoolId', '==', profile.schoolId),
            orderBy('createdAt', 'desc')
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

    const handleOpenModal = (student: any = null) => {
        if (student) {
            setSelectedStudent(student);
            setFormData({
                name: student.name,
                roll: student.roll.toString(),
                class: student.class,
                motherName: student.motherName,
                dob: student.dob
            });
        } else {
            setSelectedStudent(null);
            setFormData({
                name: '',
                roll: '',
                class: '',
                motherName: '',
                dob: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSaveStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.schoolId) return;

        setFormLoading(true);
        try {
            const data = {
                name: formData.name,
                roll: parseInt(formData.roll),
                class: formData.class,
                motherName: formData.motherName,
                dob: formData.dob,
                schoolId: profile.schoolId
            };

            if (selectedStudent) {
                // Update
                await updateDoc(doc(db, 'students', selectedStudent.id), data);
            } else {
                // Add
                await addDoc(collection(db, 'students'), {
                    ...data,
                    createdAt: serverTimestamp()
                });
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving student:", error);
            alert("Failed to save student record.");
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteClick = (student: any) => {
        setStudentToDelete(student);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!studentToDelete) return;
        try {
            await deleteDoc(doc(db, 'students', studentToDelete.id));
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error("Error deleting student:", error);
            alert("Failed to delete student record.");
        }
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.roll.toString().includes(searchTerm)
    );

    return (
        <DashboardLayout allowedRoles={['principal', 'teacher']}>
            <div className="space-y-6">
                {/* Header section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Student Catalog</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 uppercase text-xs tracking-[0.2em]">Institutional Records • Academic Year 2026-27</p>
                    </div>
                    <Button onClick={() => handleOpenModal()} className="gap-2 h-12 px-6 rounded-xl shadow-lg shadow-blue-500/20">
                        <Plus className="w-4 h-4" />
                        Add New Student
                    </Button>
                </div>

                {/* Filters and Search */}
                <Card className="p-3">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Filter records by name or roll number..."
                                className="pl-12 h-12 bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </Card>

                {/* Student Records Table */}
                <Card className="p-0 overflow-hidden border-slate-100 dark:border-slate-800/50">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="py-5 px-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Student Name</th>
                                    <th className="py-5 px-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Roll No.</th>
                                    <th className="py-5 px-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Class</th>
                                    <th className="py-5 px-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Mother's Name</th>
                                    <th className="py-5 px-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">D.O.B</th>
                                    <th className="py-5 px-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-right text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Synchronizing Database...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredStudents.length > 0 ? (
                                    filteredStudents.map((student, i) => (
                                        <motion.tr
                                            key={student.id}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group"
                                        >
                                            <td className="py-5 px-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-blue-500/10">
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 dark:text-slate-100">{student.name}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Class {student.class}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">
                                                    #{student.roll}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                    {student.class}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6">
                                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 opacity-40" />
                                                    {student.motherName}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6">
                                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                                    <Calendar className="w-3.5 h-3.5 opacity-40" />
                                                    {student.dob}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link href={`/students/${student.id}`}>
                                                        <Button variant="ghost" size="icon" className="hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                                                            <Eye className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                                                        </Button>
                                                    </Link>
                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(student)} className="hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                                        <Pencil className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(student)} className="hover:bg-red-50 dark:hover:bg-red-900/20">
                                                        <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center text-slate-300">
                                                    <Users className="w-8 h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-lg font-black text-slate-900 dark:text-white">No records found</p>
                                                    <p className="text-sm text-slate-500">Add your first student to populate the catalog.</p>
                                                </div>
                                                <Button variant="outline" onClick={() => handleOpenModal()}>Get Started</Button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Add/Edit Student Modal */}
                <AnimatePresence>
                    {isModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsModalOpen(false)}
                                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                                className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl z-10 overflow-hidden"
                            >
                                <div className="p-10 pt-12 space-y-8">
                                    <div className="flex flex-col items-center text-center">
                                        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center text-blue-600 mb-6">
                                            {selectedStudent ? <Pencil className="w-10 h-10" /> : <Plus className="w-10 h-10" />}
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                                            {selectedStudent ? 'Modify Record' : 'Enroll Student'}
                                        </h3>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium">Capture essential student information for school records</p>
                                    </div>

                                    <form onSubmit={handleSaveStudent} className="space-y-4">
                                        <Input
                                            label="Full Student Name"
                                            placeholder="e.g. Rahul Sharma"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="h-14 rounded-2xl"
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input
                                                label="Roll Number"
                                                type="number"
                                                placeholder="e.g. 1"
                                                required
                                                value={formData.roll}
                                                onChange={(e) => setFormData({ ...formData, roll: e.target.value })}
                                                className="h-14 rounded-2xl"
                                            />
                                            <Input
                                                label="Class / Grade"
                                                placeholder="e.g. 10A"
                                                required
                                                value={formData.class}
                                                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                                                className="h-14 rounded-2xl"
                                            />
                                        </div>
                                        <Input
                                            label="Mother's Name"
                                            placeholder="e.g. Sunita Sharma"
                                            required
                                            value={formData.motherName}
                                            onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                                            className="h-14 rounded-2xl"
                                        />
                                        <Input
                                            label="Date of Birth"
                                            type="date"
                                            required
                                            value={formData.dob}
                                            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                            className="h-14 rounded-2xl"
                                        />

                                        <div className="pt-6 flex flex-col sm:flex-row gap-3">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-14 rounded-2xl flex-1 font-black uppercase tracking-widest"
                                                onClick={() => setIsModalOpen(false)}
                                            >
                                                Discard
                                            </Button>
                                            <Button
                                                type="submit"
                                                className="h-14 rounded-2xl flex-1 font-black uppercase tracking-widest shadow-xl shadow-blue-500/20"
                                                isLoading={formLoading}
                                            >
                                                Save Record
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Delete Confirmation Modal */}
                <AnimatePresence>
                    {isDeleteModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                                className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl z-10 overflow-hidden"
                            >
                                <div className="p-10 space-y-6 flex flex-col items-center text-center">
                                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-3xl flex items-center justify-center text-red-600">
                                        <AlertCircle className="w-10 h-10" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Delete Record?</h3>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
                                            Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">{studentToDelete?.name}</span>? This action cannot be undone.
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2 w-full">
                                        <Button
                                            onClick={confirmDelete}
                                            className="bg-red-600 hover:bg-red-700 h-12 rounded-xl text-white font-black uppercase tracking-widest"
                                        >
                                            Confirm Delete
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setIsDeleteModalOpen(false)}
                                            className="h-12 rounded-xl font-bold text-slate-500"
                                        >
                                            Keep Record
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
}
