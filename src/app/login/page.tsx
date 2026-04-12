"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, runTransaction, Transaction } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button, Card, Input } from '@/components/ui';
import { School, Lock, Mail, Shield, AlertCircle, Loader2, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [institutionalCode, setInstitutionalCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    // Login Protection Constants
    const MAX_ATTEMPTS = 5;
    const COOLDOWN_MS = 10 * 60 * 1000; // 10 Minutes

    // Login Protection State
    const [attempts, setAttempts] = useState(0);
    const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    // Forgot Password State
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const [resetSuccess, setResetSuccess] = useState<string | null>(null);

    const router = useRouter();

    // ─── AUTH PROTECTION LOGIC ───────────────────────────────────────────
    useEffect(() => {
        // Initialize from localStorage
        const storedAttempts = localStorage.getItem('login_attempts');
        const storedCooldown = localStorage.getItem('login_cooldown_end');
        
        if (storedAttempts) setAttempts(parseInt(storedAttempts, 10));
        if (storedCooldown) {
            const end = parseInt(storedCooldown, 10);
            if (end > Date.now()) {
                setCooldownEnd(end);
            } else {
                localStorage.removeItem('login_cooldown_end');
            }
        }
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (cooldownEnd && cooldownEnd > Date.now()) {
            interval = setInterval(() => {
                const diff = Math.ceil((cooldownEnd - Date.now()) / 1000);
                if (diff <= 0) {
                    setCooldownEnd(null);
                    setRemainingSeconds(0);
                    localStorage.removeItem('login_cooldown_end');
                    setAttempts(0);
                    localStorage.setItem('login_attempts', '0');
                    clearInterval(interval);
                } else {
                    setRemainingSeconds(diff);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [cooldownEnd]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // 0. Protection Check
        if (cooldownEnd && cooldownEnd > Date.now()) {
            setError(`Too many attempts. Try again in ${formatTime(remainingSeconds)}`);
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        // 1. Preliminary Institutional Validation
        if (!institutionalCode.trim()) {
            setError("Institutional Code is required.");
            setLoading(false);
            return;
        }

        try {
            // 2. Validate School Existence
            const schoolQuery = query(
                collection(db, "schools"),
                where("code", "==", institutionalCode.trim())
            );
            const schoolSnap = await getDocs(schoolQuery);

            if (schoolSnap.empty) {
                setError("Invalid Institution Code");
                setLoading(false);
                return;
            }

            const schoolData = schoolSnap.docs[0].data();

            // Set persistence to local
            await setPersistence(auth, browserLocalPersistence);

            // 3. Firebase Auth Sign In
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 4. Fetch/Maintain User Profile (Atomic Transaction)
            const docRef = doc(db, 'users', user.uid);
            
            const data = await runTransaction(db, async (transaction: Transaction) => {
                const pDoc = await transaction.get(docRef);
                
                if (!pDoc.exists()) {
                    const newProfile = {
                        uid: user.uid,
                        email: user.email,
                        role: "principal",
                        schoolId: institutionalCode.trim(),
                        class: null,
                        division: null,
                        status: 'active',
                        createdAt: serverTimestamp()
                    };
                    transaction.set(docRef, newProfile);
                    return newProfile;
                }
                
                return pDoc.data();
            });
            
            if (!data) {
                throw { code: 'custom/initialization-failed' };
            }

            // 5. Strict Multi-School Isolation Check
            if (data.schoolId !== institutionalCode.trim()) {
                await auth.signOut();
                throw { code: 'custom/isolation-breach' };
            }

            // 6. Validate Account Status
            if (data.status === 'disabled') {
                await auth.signOut();
                throw { code: 'custom/account-disabled' };
            }

            // 7. Check Subscription Status
            const expiryDate = schoolData.expiryDate?.toDate();
            const now = new Date();

            if (expiryDate && now > expiryDate) {
                await auth.signOut();
                throw { code: 'custom/subscription-expired' };
            }

            // SUCCESS PATH
            setAttempts(0);
            localStorage.setItem('login_attempts', '0');
            localStorage.removeItem('login_cooldown_end');

            setSuccessMessage("Login successful, preparing your dashboard...");

            if (data.role === 'superadmin') {
                router.push('/superadmin/dashboard');
            } else if (data.role === 'admin') {
                router.push('/dashboard/admin');
            } else if (data.role === 'principal') {
                router.push('/dashboard/principal');
            } else if (data.role === 'teacher') {
                router.push('/dashboard/teacher');
            } else {
                setError("Unauthorized role. Please contact support.");
                await auth.signOut();
                setLoading(false);
            }
        } catch (err: any) {
            console.error(err);

            // Increment Attempts
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            localStorage.setItem('login_attempts', newAttempts.toString());

            if (newAttempts >= MAX_ATTEMPTS) {
                const end = Date.now() + COOLDOWN_MS;
                setCooldownEnd(end);
                localStorage.setItem('login_cooldown_end', end.toString());
            }

            // User friendly error messages
            let message = "Unable to login. Please try again.";

            if (err.code === 'custom/invalid-school') {
                message = "Invalid Institutional Code. Please verify your credentials.";
            } else if (err.code === 'custom/initialization-failed') {
                message = "Unable to initialize user workspace. Please contact support.";
            } else if (err.code === 'custom/isolation-breach') {
                message = "Access Denied: Your account is not authorized for this institution.";
            } else if (err.code === 'custom/account-disabled') {
                message = "Your institutional account has been locked.";
            } else if (err.code === 'custom/subscription-expired') {
                message = "Institutional access expired. Please contact administration.";
            } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                message = `Invalid email or password. Attempt ${newAttempts}/${MAX_ATTEMPTS}`;
            } else if (err.code === 'auth/invalid-email') {
                message = "The email address format is not valid.";
            } else if (err.code === 'auth/too-many-requests') {
                message = "Global rate limit hit. Specific institution cooldown triggered.";
                const end = Date.now() + COOLDOWN_MS;
                setCooldownEnd(end);
                localStorage.setItem('login_cooldown_end', end.toString());
            }

            setError(message);
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetEmail.trim()) {
            setResetError("Email is required.");
            return;
        }

        setResetLoading(true);
        setResetError(null);
        setResetSuccess(null);

        try {
            await sendPasswordResetEmail(auth, resetEmail);
            setResetSuccess("Password reset link sent to your email. Please check your inbox.");
        } catch (err: any) {
            console.error(err);
            let msg = "Could not send reset email.";
            if (err.code === 'auth/user-not-found') msg = "No account found with this email.";
            else if (err.code === 'auth/invalid-email') msg = "Email address is invalid.";
            setResetError(msg);
        } finally {
            setResetLoading(false);
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
                                disabled={loading || !!cooldownEnd}
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
                                disabled={loading || !!cooldownEnd}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Lock className="w-3 h-3" />
                                    Secure Password
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsForgotModalOpen(true)}
                                    className="text-[10px] font-bold text-blue-600 uppercase tracking-wider hover:underline underline-offset-2"
                                >
                                    Forgot?
                                </button>
                            </div>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 transition-all font-bold"
                                required
                                disabled={loading || !!cooldownEnd}
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

                        {successMessage && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold rounded-xl flex items-center gap-3"
                            >
                                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                                {successMessage}
                            </motion.div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            isLoading={loading}
                            disabled={loading || !!cooldownEnd}
                        >
                            {loading ? "Authenticating..." : cooldownEnd ? `Unlocked in ${formatTime(remainingSeconds)}` : "Authenticate"}
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

            {/* Forgot Password Modal */}
            <AnimatePresence>
                {isForgotModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsForgotModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
                        >
                            <div className="p-8 md:p-10 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600">
                                        <Lock className="w-6 h-6" />
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsForgotModalOpen(false);
                                            setResetError(null);
                                            setResetSuccess(null);
                                        }}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                                        aria-label="Close modal"
                                    >
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>

                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">Reset Password</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Enter your email and we'll send you a recovery link.</p>
                                </div>

                                <form onSubmit={handleResetPassword} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registered Email</label>
                                        <Input
                                            type="email"
                                            placeholder="name@school.com"
                                            value={resetEmail}
                                            onChange={(e) => setResetEmail(e.target.value)}
                                            className="h-14 rounded-2xl font-bold"
                                            required
                                        />
                                    </div>

                                    {resetError && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl flex items-center gap-2"
                                        >
                                            <AlertCircle className="w-4 h-4" />
                                            {resetError}
                                        </motion.div>
                                    )}

                                    {resetSuccess && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            {resetSuccess}
                                        </motion.div>
                                    )}

                                    <Button
                                        type="submit"
                                        className="w-full h-14 rounded-2xl bg-blue-600 font-black uppercase tracking-widest text-xs"
                                        isLoading={resetLoading}
                                        disabled={resetLoading || !!resetSuccess}
                                    >
                                        {resetLoading ? "Sending Link..." : "Send Recovery Link"}
                                    </Button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

