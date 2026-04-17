"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    sendPasswordResetEmail
} from 'firebase/auth';
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    collection,
    query,
    where,
    getDocs
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button, Card, Input } from '@/components/ui';
import {
    School, Lock, Mail, Shield, AlertCircle, Loader2, X, CheckCircle2, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// ─── Constants ──────────────────────────────────────────────────────────────
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [institutionalCode, setInstitutionalCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Rate limiting state (localStorage-backed)
    const [attempts, setAttempts] = useState(0);
    const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    // Forgot Password modal state
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const [resetSuccess, setResetSuccess] = useState<string | null>(null);

    const router = useRouter();

    // ── Restore rate-limit state from localStorage ────────────────────────
    useEffect(() => {
        const storedAttempts = localStorage.getItem('login_attempts');
        const storedCooldown = localStorage.getItem('login_cooldown_end');

        if (storedAttempts) setAttempts(parseInt(storedAttempts, 10));
        if (storedCooldown) {
            const end = parseInt(storedCooldown, 10);
            if (end > Date.now()) {
                setCooldownEnd(end);
            } else {
                localStorage.removeItem('login_cooldown_end');
                localStorage.removeItem('login_attempts');
            }
        }
    }, []);

    // ── Countdown timer ───────────────────────────────────────────────────
    useEffect(() => {
        if (!cooldownEnd || cooldownEnd <= Date.now()) return;
        const interval = setInterval(() => {
            const diff = Math.ceil((cooldownEnd - Date.now()) / 1000);
            if (diff <= 0) {
                setCooldownEnd(null);
                setRemainingSeconds(0);
                setAttempts(0);
                localStorage.removeItem('login_cooldown_end');
                localStorage.setItem('login_attempts', '0');
                clearInterval(interval);
            } else {
                setRemainingSeconds(diff);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [cooldownEnd]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // ── Record a failed attempt and maybe trigger lockout ─────────────────
    const recordFailedAttempt = (current: number) => {
        const next = current + 1;
        setAttempts(next);
        localStorage.setItem('login_attempts', next.toString());
        if (next >= MAX_ATTEMPTS) {
            const end = Date.now() + COOLDOWN_MS;
            setCooldownEnd(end);
            localStorage.setItem('login_cooldown_end', end.toString());
        }
        return next;
    };

    // ── Main login handler ────────────────────────────────────────────────
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (cooldownEnd && cooldownEnd > Date.now()) {
            setError(`Too many failed attempts. Try again in ${formatTime(remainingSeconds)}.`);
            return;
        }

        if (!institutionalCode.trim()) {
            setError('Institutional Code is required.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // ── STEP 1: Set session persistence ──────────────────────────
            await setPersistence(auth, browserLocalPersistence);

            // ── STEP 2: Authenticate with Firebase (Auth FIRST) ──────────
            // We sign in before querying Firestore because our Firestore rules
            // require `isSignedIn()`. Querying before auth would result in
            // permission-denied errors.
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // ── STEP 3: Fetch user profile (self-read is always allowed) ──
            const profileRef = doc(db, 'users', user.uid);
            const profileSnap = await getDoc(profileRef);

            let profileData: {
                uid: string;
                email: string | null;
                name: string;
                role: string;
                schoolId: string;
                status: string;
                class?: string | null;
                division?: string | null;
            };

            if (profileSnap.exists()) {
                profileData = profileSnap.data() as typeof profileData;
            } else {
                // ── AUTO-HEAL: Profile missing in Firestore ───────────────
                // Validate the entered institutional code against schools collection.
                // Now that the user is authenticated, the schools read rule is satisfied.
                const schoolQuery = query(
                    collection(db, 'schools'),
                    where('code', '==', institutionalCode.trim())
                );
                const schoolSnap = await getDocs(schoolQuery);

                if (schoolSnap.empty) {
                    await auth.signOut();
                    throw { code: 'custom/invalid-school' };
                }

                const healedProfile = {
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName || user.email?.split('@')[0] || 'Principal',
                    role: 'principal',
                    schoolId: institutionalCode.trim(),
                    class: null,
                    division: null,
                    status: 'active',
                    createdAt: serverTimestamp(),
                };

                await setDoc(profileRef, healedProfile);
                profileData = healedProfile;
            }

            // ── STEP 4: Multi-tenant isolation check ─────────────────────
            // The user's stored schoolId MUST match the entered institution code.
            if (profileData.schoolId !== institutionalCode.trim()) {
                await auth.signOut();
                throw { code: 'custom/isolation-breach' };
            }

            // ── STEP 5: Account status check ──────────────────────────────
            const status = (profileData.status ?? '').toLowerCase();
            if (status === 'disabled') {
                await auth.signOut();
                throw { code: 'custom/account-disabled' };
            }

            // ── STEP 6: Subscription check ────────────────────────────────
            // Safe read — user is authenticated and isSameSchool will pass
            // since we just validated schoolId matches.
            try {
                const schoolDocSnap = await getDoc(doc(db, 'schools', profileData.schoolId));
                if (schoolDocSnap.exists()) {
                    const schoolData = schoolDocSnap.data();
                    const expiryDate = schoolData.expiryDate?.toDate?.();
                    if (expiryDate && new Date() > expiryDate) {
                        await auth.signOut();
                        throw { code: 'custom/subscription-expired' };
                    }
                }
            } catch (subErr: any) {
                // Re-throw custom errors; swallow Firestore read errors (non-fatal)
                if (subErr?.code?.startsWith('custom/')) throw subErr;
                console.warn('Subscription check skipped:', subErr);
            }

            // ── STEP 7: SUCCESS ───────────────────────────────────────────
            setAttempts(0);
            localStorage.setItem('login_attempts', '0');
            localStorage.removeItem('login_cooldown_end');
            setSuccessMessage('Login successful — preparing your dashboard...');

            const role = profileData.role;
            if (role === 'superadmin') {
                router.push('/superadmin/dashboard');
            } else if (role === 'principal') {
                router.push('/dashboard/principal');
            } else if (role === 'teacher') {
                router.push('/dashboard/teacher');
            } else {
                setError('Unauthorized role. Please contact support.');
                await auth.signOut();
                setLoading(false);
            }
        } catch (err: any) {
            console.error('Login error:', err);

            const next = recordFailedAttempt(attempts);

            let message = 'Unable to login. Please try again.';

            if (err.code === 'custom/invalid-school') {
                message = 'Invalid Institutional Code. Please check and try again.';
            } else if (err.code === 'custom/isolation-breach') {
                message = 'Access Denied: Your account is not registered under this institution.';
            } else if (err.code === 'custom/account-disabled') {
                message = 'Your account has been disabled. Please contact administration.';
            } else if (err.code === 'custom/subscription-expired') {
                message = 'Institutional subscription has expired. Please contact administration.';
            } else if (
                err.code === 'auth/user-not-found' ||
                err.code === 'auth/wrong-password' ||
                err.code === 'auth/invalid-credential'
            ) {
                message = `Invalid email or password. Attempt ${next}/${MAX_ATTEMPTS}.`;
            } else if (err.code === 'auth/invalid-email') {
                message = 'The email address format is not valid.';
            } else if (err.code === 'auth/too-many-requests') {
                message = 'Too many requests. Account temporarily locked by Firebase.';
                const end = Date.now() + COOLDOWN_MS;
                setCooldownEnd(end);
                localStorage.setItem('login_cooldown_end', end.toString());
            }

            if (next >= MAX_ATTEMPTS && !err.code?.startsWith('custom/')) {
                message = `Account locked for 10 minutes after ${MAX_ATTEMPTS} failed attempts.`;
            }

            setError(message);
            setLoading(false);
        }
    };

    // ── Forgot Password handler ───────────────────────────────────────────
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetEmail.trim()) {
            setResetError('Email is required.');
            return;
        }

        setResetLoading(true);
        setResetError(null);
        setResetSuccess(null);

        try {
            await sendPasswordResetEmail(auth, resetEmail);
            setResetSuccess('Password reset link sent! Please check your inbox.');
        } catch (err: any) {
            let msg = 'Could not send reset email. Please try again.';
            if (err.code === 'auth/user-not-found') msg = 'No account found with this email.';
            else if (err.code === 'auth/invalid-email') msg = 'Email address is invalid.';
            setResetError(msg);
        } finally {
            setResetLoading(false);
        }
    };

    const isLocked = !!cooldownEnd && cooldownEnd > Date.now();

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
            {/* Aesthetic blobs */}
            <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 animate-pulse" />
            <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 animate-pulse delay-1000" />

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
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-black uppercase tracking-[0.2em] text-[10px]">
                        Institutional SaaS Portal
                    </p>
                </div>

                <Card className="p-8 md:p-10 border-slate-100 dark:border-slate-800 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        {/* Institutional Code */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Shield className="w-3 h-3" />
                                Institutional Code
                            </label>
                            <Input
                                id="institutional-code"
                                placeholder="e.g. SCH-A3Z9"
                                value={institutionalCode}
                                onChange={(e) => { setInstitutionalCode(e.target.value.toUpperCase()); setError(null); }}
                                className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 transition-all font-bold"
                                required
                                disabled={loading || isLocked}
                                autoComplete="off"
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Mail className="w-3 h-3" />
                                Professional Email
                            </label>
                            <Input
                                id="login-email"
                                type="email"
                                placeholder="name@school.com"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                                className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 transition-all font-bold"
                                required
                                disabled={loading || isLocked}
                            />
                        </div>

                        {/* Password */}
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
                                id="login-password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                                className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 transition-all font-bold"
                                required
                                disabled={loading || isLocked}
                            />
                        </div>

                        {/* Attempts indicator */}
                        {attempts > 0 && attempts < MAX_ATTEMPTS && !isLocked && (
                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider text-center">
                                {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} remaining before lockout
                            </p>
                        )}

                        {/* Error message */}
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl flex items-center gap-3"
                                >
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </motion.div>
                            )}

                            {/* Success message */}
                            {successMessage && (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold rounded-xl flex items-center gap-3"
                                >
                                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                                    {successMessage}
                                </motion.div>
                            )}

                            {/* Locked state */}
                            {isLocked && (
                                <motion.div
                                    key="locked"
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-bold rounded-xl flex items-center gap-3"
                                >
                                    <Clock className="w-4 h-4 flex-shrink-0" />
                                    Account locked. Try again in {formatTime(remainingSeconds)}.
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <Button
                            id="login-submit"
                            type="submit"
                            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            isLoading={loading}
                            disabled={loading || isLocked}
                        >
                            {loading
                                ? 'Authenticating...'
                                : isLocked
                                ? `Unlocks in ${formatTime(remainingSeconds)}`
                                : 'Authenticate'}
                        </Button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-slate-500 font-medium">
                            Need a portal?{' '}
                            <Link
                                href="/register-school"
                                className="text-blue-600 font-black uppercase tracking-widest text-[10px] hover:underline underline-offset-4"
                            >
                                Register Institution
                            </Link>
                        </p>
                        <p className="text-slate-400 font-medium mt-2 text-[10px] uppercase tracking-wider">
                            Joining a school?{' '}
                            <Link
                                href="/register"
                                className="text-slate-900 dark:text-white font-black hover:underline underline-offset-4"
                            >
                                Join as Faculty
                            </Link>
                        </p>
                    </div>
                </Card>

                <p className="text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                    EduCatalog v2.0 • Powered by Cloud SaaS Infrastructure
                </p>
            </motion.div>

            {/* ── Forgot Password Modal ────────────────────────────────────── */}
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
                                            setResetEmail('');
                                        }}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                                        aria-label="Close modal"
                                    >
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>

                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">Reset Password</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                        Enter your email and we&apos;ll send you a recovery link.
                                    </p>
                                </div>

                                <form onSubmit={handleResetPassword} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            Registered Email
                                        </label>
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
                                        {resetLoading ? 'Sending Link...' : 'Send Recovery Link'}
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
