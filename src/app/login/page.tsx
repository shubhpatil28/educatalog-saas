"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useRouter as useAppRouter } from 'next/navigation';
import {
    signInWithEmailAndPassword,
    signOut
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
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

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

    const router = useAppRouter();

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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        if (cooldownEnd && cooldownEnd > Date.now()) {
            setError(`Account locked. Try again in ${formatTime(remainingSeconds)}.`);
            return;
        }

        if (!institutionalCode.trim() || !email.trim() || !password.trim()) {
            setError('All credentials and school code are required.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // STEP 1: Verify Institutional Code
            const schoolQuery = query(
                collection(db, 'schools'),
                where('code', '==', institutionalCode.trim().toUpperCase())
            );
            const schoolSnap = await getDocs(schoolQuery);

            if (schoolSnap.empty) {
                throw { code: 'custom/invalid-school' };
            }

            const schoolId = schoolSnap.docs[0].id;

            // STEP 2: Authenticate Professional Credentials
            const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
            const user = userCredential.user;

            // STEP 3 & 4: Profile Sync and Self-Healing
            const profileRef = doc(db, 'users', user.uid);
            const profileSnap = await getDoc(profileRef);

            let finalProfile;
            if (!profileSnap.exists()) {
                // AUTO-CREATE PROFILE (Self-Healing)
                finalProfile = {
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName || email.split('@')[0],
                    role: 'principal', // Default to principal for institution owners
                    schoolId: schoolId,
                    status: 'active',
                    createdAt: serverTimestamp(),
                };
                await setDoc(profileRef, finalProfile);
            } else {
                finalProfile = profileSnap.data();
                // Isolation Guard: Match Institutional Binding
                if (finalProfile.schoolId !== schoolId) {
                    await signOut(auth);
                    throw { code: 'custom/isolation-breach' };
                }
            }

            // Success Handshake
            localStorage.setItem('login_attempts', '0');
            setAttempts(0);
            setSuccessMessage('Professional identity verified. Redirecting...');
            router.push(finalProfile.role === 'principal' ? '/dashboard/principal' : '/dashboard/teacher');

        } catch (err: any) {
            console.error("Login error:", err);
            const nextCount = recordFailedAttempt(attempts);

            let msg = 'Login failed. Verify credentials.';
            if (err.code === 'custom/invalid-school') msg = 'Institutional registry code not found.';
            else if (err.code === 'custom/isolation-breach') msg = 'Account not bound to this institution.';
            else if (err.code === 'auth/wrong-password') msg = 'Invalid password.';
            else if (err.code === 'auth/user-not-found') msg = 'Account not detected.';
            else if (nextCount >= MAX_ATTEMPTS) msg = 'Security lockout protocol engaged. Try later.';

            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const isLocked = !!cooldownEnd && cooldownEnd > Date.now();

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
            <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 animate-pulse" />
            <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 animate-pulse delay-1000" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md space-y-8 relative z-10"
            >
                <div className="text-center">
                    <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-3xl shadow-2xl shadow-blue-500/30 mb-6 font-black text-white">
                        <School className="w-10 h-10" />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">EduCatalog</h1>
                    <p className="text-slate-500 mt-2 font-black uppercase tracking-[0.2em] text-[10px]">Portal Authenticator</p>
                </div>

                <Card className="p-8 md:p-10 border-slate-100 dark:border-slate-800 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        <Input
                            label="Institutional Registry ID"
                            placeholder="e.g. SCH-XXXX"
                            value={institutionalCode}
                            onChange={(e) => setInstitutionalCode(e.target.value.toUpperCase())}
                            required
                            disabled={loading || isLocked}
                            className="h-14 rounded-2xl font-bold"
                        />
                        <Input
                            label="Professional Identity (Email)"
                            type="email"
                            placeholder="staff@institution.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading || isLocked}
                            className="h-14 rounded-2xl font-bold"
                        />
                        <Input
                            label="Security Access Key"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading || isLocked}
                            className="h-14 rounded-2xl font-bold"
                        />

                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {successMessage && (
                            <div className="p-4 bg-emerald-50 text-emerald-600 text-sm font-bold rounded-xl flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                {successMessage}
                            </div>
                        )}

                        {isLocked && (
                            <div className="p-4 bg-amber-50 text-amber-700 text-sm font-bold rounded-xl flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Locked. Protocol resets in {formatTime(remainingSeconds)}.
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-14 rounded-2xl bg-blue-600 font-black uppercase tracking-widest text-xs"
                            isLoading={loading}
                            disabled={loading || isLocked}
                        >
                            {isLocked ? 'Locked' : 'Authenticate Access'}
                        </Button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
                        <p className="text-xs text-slate-500 font-medium">
                            Need institutional access? <Link href="/register-school" className="text-blue-600 font-black uppercase">Register School</Link>
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                            Joining as staff? <Link href="/register" className="text-slate-900 dark:text-white font-black uppercase">Join Institution</Link>
                        </p>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
