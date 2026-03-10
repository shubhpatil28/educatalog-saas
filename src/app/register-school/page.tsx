"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button, Card, Input, cn } from '@/components/ui';
import {
    School,
    User,
    Mail,
    Phone,
    Lock,
    ShieldCheck,
    ArrowRight,
    Loader2,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function RegisterSchoolPage() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const [formData, setFormData] = useState({
        // School Details
        schoolName: '',
        schoolCode: '',
        phone: '',
        // Principal Details
        principalName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validation
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters.");
            setLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            setLoading(false);
            return;
        }

        try {
            // 1. Check if School Code is unique
            const schoolDocRef = doc(db, 'schools', formData.schoolCode.toUpperCase());
            const schoolDoc = await getDoc(schoolDocRef);

            if (schoolDoc.exists()) {
                setError("This institution code is already registered.");
                setLoading(false);
                return;
            }

            // 2. Create Firebase Auth Account
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const uid = userCredential.user.uid;

            // 3. Create School Document
            const trialExpiry = new Date();
            trialExpiry.setDate(trialExpiry.getDate() + 30);

            await setDoc(schoolDocRef, {
                name: formData.schoolName,
                principalName: formData.principalName,
                email: formData.email,
                phone: formData.phone,
                schoolCode: formData.schoolCode.toUpperCase(),
                plan: "trial",
                trialDays: 30,
                subscriptionStatus: "active",
                createdAt: serverTimestamp(),
                expiryDate: Timestamp.fromDate(trialExpiry)
            });

            // 4. Create Principal Profile
            await setDoc(doc(db, 'users', uid), {
                name: formData.principalName,
                email: formData.email,
                role: "principal",
                schoolId: formData.schoolCode.toUpperCase(),
                status: "Active",
                createdAt: serverTimestamp()
            });

            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard/principal');
            }, 2000);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "An error occurred during registration.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Aesthetics */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl -mr-64 -mt-32 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl -ml-64 -mb-32 animate-pulse delay-1000" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
                <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] shadow-2xl shadow-blue-500/20 mb-6 text-white rotate-3 hover:rotate-0 transition-transform duration-500">
                    <School className="w-10 h-10" />
                </div>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Onboard Institution</h2>
                <p className="mt-2 text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">Start your 30-Day Free Trial</p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
                <Card className="px-8 py-10 border-slate-100 dark:border-slate-800 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem]">
                    <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-12 text-center"
                            >
                                <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 mb-6">
                                    <CheckCircle2 className="w-12 h-12" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Workspace Initialized!</h3>
                                <p className="text-slate-500 font-medium">Redirecting you to your new institutional headquarters...</p>
                            </motion.div>
                        ) : (
                            <form className="space-y-8" onSubmit={handleRegister}>
                                {/* Progress Indicator */}
                                <div className="flex items-center justify-center gap-2 mb-4">
                                    <div className={cn("h-1.5 rounded-full transition-all duration-500", step === 1 ? "w-12 bg-blue-600" : "w-4 bg-slate-200")} />
                                    <div className={cn("h-1.5 rounded-full transition-all duration-500", step === 2 ? "w-12 bg-blue-600" : "w-4 bg-slate-200")} />
                                </div>

                                {step === 1 ? (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl">
                                                <ShieldCheck className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 dark:text-white">School Registry</h3>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Institutional Identity</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Input
                                                label="Institution Name"
                                                name="schoolName"
                                                placeholder="e.g. Sunrise Academy"
                                                value={formData.schoolName}
                                                onChange={handleChange}
                                                required
                                                className="h-14 rounded-2xl"
                                            />
                                            <Input
                                                label="Unique School Code"
                                                name="schoolCode"
                                                placeholder="e.g. SUN-2026"
                                                value={formData.schoolCode}
                                                onChange={handleChange}
                                                required
                                                className="h-14 rounded-2xl uppercase"
                                            />
                                        </div>
                                        <Input
                                            label="Official Phone Number"
                                            name="phone"
                                            placeholder="+91 98765 43210"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            required
                                            className="h-14 rounded-2xl"
                                        />

                                        <Button
                                            type="button"
                                            className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest gap-2 bg-slate-900"
                                            onClick={() => setStep(2)}
                                        >
                                            Next: Principal Details
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl">
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 dark:text-white">Principal Credentials</h3>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Administrative Access</p>
                                            </div>
                                        </div>

                                        <Input
                                            label="Full Name"
                                            name="principalName"
                                            placeholder="Amit Sharma"
                                            value={formData.principalName}
                                            onChange={handleChange}
                                            required
                                            className="h-14 rounded-2xl"
                                        />
                                        <Input
                                            label="Professional Email"
                                            name="email"
                                            type="email"
                                            placeholder="principal@school.com"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            className="h-14 rounded-2xl"
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Input
                                                label="Create Password"
                                                name="password"
                                                type="password"
                                                placeholder="••••••••"
                                                value={formData.password}
                                                onChange={handleChange}
                                                required
                                                className="h-14 rounded-2xl"
                                            />
                                            <Input
                                                label="Confirm Password"
                                                name="confirmPassword"
                                                type="password"
                                                placeholder="••••••••"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                required
                                                className="h-14 rounded-2xl"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            <Button
                                                type="submit"
                                                className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20"
                                                isLoading={loading}
                                                disabled={loading}
                                            >
                                                {loading ? "Provisioning Vault..." : "Establish Workspace"}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest"
                                                onClick={() => setStep(1)}
                                            >
                                                Back: School Details
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-3"
                                    >
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        {error}
                                    </motion.div>
                                )}
                            </form>
                        )}
                    </AnimatePresence>

                    <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-slate-500 font-medium">
                            Already registered? {' '}
                            <Link href="/login" className="text-blue-600 font-black uppercase tracking-widest text-[10px] hover:underline underline-offset-4">
                                Sign In here
                            </Link>
                        </p>
                    </div>
                </Card>
            </div>

            <p className="mt-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                Protected by Institutional Grade Security & Multi-Tenant Isolation
            </p>
        </div>
    );
}
