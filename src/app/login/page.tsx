"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button, Card, Input } from '@/components/ui';
import { School, Lock, Mail, Shield, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [institutionalCode, setInstitutionalCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Set persistence to local
            await setPersistence(auth, browserLocalPersistence);

            // 1. Firebase Auth Sign In
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Fetch User Profile from Firestore
            const profileDoc = await getDoc(doc(db, 'users', user.uid));

            if (profileDoc.exists()) {
                const data = profileDoc.data();

                // 3. Validate Institutional Code (Matching schoolId)
                if (data.schoolId !== institutionalCode) {
                    await auth.signOut();
                    setError("Invalid Institutional Code for this account. Please verify and try again.");
                    setLoading(false);
                    return;
                }

                // 4. Validate Account Status
                if (data.status === 'Disabled') {
                    await auth.signOut();
                    setError("Your institutional account has been locked. Please contact your administrator.");
                    setLoading(false);
                    return;
                }

                // 5. Check Subscription Status
                if (data.schoolId) {
                    const schoolDoc = await getDoc(doc(db, 'schools', data.schoolId));
                    if (schoolDoc.exists()) {
                        const schoolData = schoolDoc.data();
                        const expiryDate = schoolData.expiryDate?.toDate();
                        const now = new Date();

                        if (expiryDate && now > expiryDate) {
                            setError("Trial Expired. Please renew your subscription to continue using EduCatalog.");
                            setLoading(false);
                            await auth.signOut();
                            return;
                        }
                    }
                }

                // 6. Role Based Redirect
                if (data.role === 'principal') {
                    router.push('/dashboard/principal');
                } else if (data.role === 'teacher') {
                    router.push('/dashboard/teacher');
                } else {
                    setError("Unauthorized role. Please contact support.");
                    await auth.signOut();
                }
            } else {
                setError("Account profile not found in our records. Please contact administration.");
                await auth.signOut();
            }
        } catch (err: any) {
            console.error(err);

            // User friendly error messages for Firebase
            let message = "Failed to authenticate. Please check your credentials.";

            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                message = "Invalid email or password. Please try again.";
            } else if (err.code === 'auth/invalid-email') {
                message = "The email address is not valid.";
            } else if (err.code === 'auth/too-many-requests') {
                message = "Too many failed attempts. Please try again later.";
            } else if (err.message) {
                message = err.message;
            }

            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
            {/* Aesthetic Background Elements */}
            <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 animate-pulse"></div>
            <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 animate-pulse delay-1000"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md space-y-8 relative z-10"
            >
                <div className="text-center">
                    <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-3xl shadow-2xl shadow-blue-500/30 mb-6 font-black text-white">
                        <School className="w-10 h-10" />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">EduCatalog</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-black uppercase tracking-[0.2em] text-[10px]">Institutional SaaS Portal</p>
                </div>

                <Card className="p-8 md:p-10 border-slate-100 dark:border-slate-800 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Shield className="w-3 h-3" />
                                Institutional Code
                            </label>
                            <Input
                                placeholder="e.g. STH-2024"
                                value={institutionalCode}
                                onChange={(e) => setInstitutionalCode(e.target.value)}
                                className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 transition-all font-bold"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Mail className="w-3 h-3" />
                                Professional Email
                            </label>
                            <Input
                                type="email"
                                placeholder="name@school.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 transition-all font-bold"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Lock className="w-3 h-3" />
                                Secure Password
                            </label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 transition-all font-bold"
                                required
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl flex items-center gap-3"
                            >
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </motion.div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            isLoading={loading}
                            disabled={loading}
                        >
                            {loading ? "Authenticating..." : "Authenticate"}
                        </Button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-slate-500 font-medium">
                            Need a portal? {' '}
                            <Link href="/register-school" className="text-blue-600 font-black uppercase tracking-widest text-[10px] hover:underline underline-offset-4">
                                Register Institution
                            </Link>
                        </p>
                    </div>
                </Card>

                <p className="text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                    EduCatalog v2.0 • Powered by Cloud SaaS Infrastructure
                </p>
            </motion.div>
        </div>
    );
}
