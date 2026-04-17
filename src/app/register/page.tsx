"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import {
    doc,
    setDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button, Card, Input } from '@/components/ui';
import {
    User, Mail, Lock, Shield, ArrowRight, Loader2, AlertCircle, School, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function GeneralRegistrationPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [schoolId, setSchoolId] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        institutionalCode: '',
    });

    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: name === 'institutionalCode' ? value.toUpperCase() : value 
        }));
        setError(null);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (formData.password.length < 6) return setError('Password must be at least 6 characters.');
        if (formData.password !== formData.confirmPassword) return setError('Passwords do not match.');
        if (!formData.institutionalCode.trim()) return setError('Institutional Code is required.');

        setLoading(true);
        try {
            // 1. Validate Institutional Code
            const schoolQuery = query(
                collection(db, 'schools'),
                where('code', '==', formData.institutionalCode.trim())
            );
            const schoolSnap = await getDocs(schoolQuery);

            if (schoolSnap.empty) {
                throw new Error('Invalid Institutional Code. Please check with your administrator.');
            }

            // 2. Create Auth Account
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            await updateProfile(user, { displayName: formData.name });

            // 3. Create Firestore Profile
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: formData.email.trim(),
                name: formData.name.trim(),
                role: 'teacher', // Default role for general registration
                schoolId: formData.institutionalCode.trim(),
                status: 'active',
                createdAt: serverTimestamp(),
            });

            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard/teacher');
            }, 2000);

        } catch (err: any) {
            console.error(err);
            let msg = 'Registration failed. Please try again.';
            if (err.code === 'auth/email-already-in-use') msg = 'This email is already registered.';
            else if (err.code === 'auth/invalid-email') msg = 'Invalid email address format.';
            else if (err.message) msg = err.message;
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-blue-500/5 mix-blend-multiply filter blur-3xl pointer-events-none" />
            
            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-8">
                <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-3xl shadow-2xl mb-6 text-white">
                    <User className="w-10 h-10" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Faculty Registration</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-black uppercase tracking-[0.2em] text-[10px]">
                    Join your institutional workspace
                </p>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
                <Card className="p-8 border-slate-100 dark:border-slate-800 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                    <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-10 text-center space-y-4"
                            >
                                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-500 mx-auto">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Registration Successful!</h3>
                                <p className="text-slate-500 font-medium">Setting up your faculty dashboard...</p>
                            </motion.div>
                        ) : (
                            <form className="space-y-5" onSubmit={handleRegister}>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Shield className="w-3 h-3" /> Institutional Code
                                    </label>
                                    <Input
                                        name="institutionalCode"
                                        placeholder="e.g. SCH-XXXX"
                                        value={formData.institutionalCode}
                                        onChange={handleChange}
                                        required
                                        className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <Input
                                        name="name"
                                        placeholder="e.g. John Doe"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        className="h-14 rounded-2xl"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Professional Email</label>
                                    <Input
                                        name="email"
                                        type="email"
                                        placeholder="name@school.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="h-14 rounded-2xl"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                        <Input
                                            name="password"
                                            type="password"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            className="h-14 rounded-2xl"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm</label>
                                        <Input
                                            name="confirmPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            required
                                            className="h-14 rounded-2xl"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-3">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full h-14 rounded-2xl bg-blue-600 font-black uppercase tracking-widest text-xs"
                                    isLoading={loading}
                                >
                                    Join Workspace <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </form>
                        )}
                    </AnimatePresence>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center space-y-3">
                        <p className="text-slate-500 font-medium text-xs">
                            Own a school?{' '}
                            <Link href="/register-school" className="text-blue-600 font-black uppercase tracking-widest text-[10px] hover:underline underline-offset-4">
                                Onboard Institution
                            </Link>
                        </p>
                        <p className="text-slate-400 font-medium text-[10px] uppercase">
                            Already have an account?{' '}
                            <Link href="/login" className="text-slate-900 dark:text-white font-black hover:underline underline-offset-4">
                                Login
                            </Link>
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
