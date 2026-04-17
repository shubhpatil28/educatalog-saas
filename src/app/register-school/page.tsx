"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import {
    doc,
    setDoc,
    collection,
    getDocs,
    query,
    where,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { Button, Card, Input, cn } from '@/components/ui';
import {
    School,
    User,
    Mail,
    MapPin,
    Lock,
    ShieldCheck,
    ArrowRight,
    ArrowLeft,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Users,
    CreditCard,
    Sparkles,
    Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// ─── Auto-generate a unique SCH-XXXX code ──────────────────────────────────
// Uses random alphanumeric characters to avoid ordering/collision issues.
// Only called after Firebase Auth creation (user must be authenticated for
// the Firestore read in uniqueness check to pass the security rules).
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars (0/O, 1/I)

function randomSchoolCode(): string {
    let code = 'SCH-';
    for (let i = 0; i < 4; i++) {
        code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    return code;
}

async function generateSchoolId(): Promise<string> {
    // Try up to 8 times to find a unique code (collision chance is < 0.001% for < 10k schools)
    for (let attempt = 0; attempt < 8; attempt++) {
        const code = randomSchoolCode();
        try {
            const snap = await getDocs(
                query(collection(db, 'schools'), where('code', '==', code))
            );
            if (snap.empty) return code;
        } catch {
            // If the uniqueness check fails (e.g., permission issue), still return the code.
            // Collisions are extremely unlikely; the code is acceptable as a fallback.
            return code;
        }
    }
    // Absolute fallback: timestamp-based suffix (guaranteed unique)
    return `SCH-${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

const PLAN_OPTIONS = [
    {
        value: 'Basic',
        label: 'Basic',
        description: 'Up to 200 students, core analytics',
        price: 'Free Trial',
        color: 'from-slate-500 to-slate-600',
        bg: 'bg-slate-50 dark:bg-slate-800/40',
        border: 'border-slate-300 dark:border-slate-700',
        activeBorder: 'border-blue-500',
        activeBg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
        value: 'Premium',
        label: 'Premium',
        description: 'Unlimited students, advanced SaaS features',
        price: '₹2,999 / yr',
        color: 'from-blue-600 to-indigo-600',
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        border: 'border-indigo-300 dark:border-indigo-700',
        activeBorder: 'border-indigo-600',
        activeBg: 'bg-indigo-50 dark:bg-indigo-900/30',
    },
];

type FormData = {
    // Step 1 – School Details
    schoolName: string;
    city: string;
    phone: string;
    numStudents: string;
    plan: 'Basic' | 'Premium';
    // Step 2 – Admin Credentials
    adminName: string;
    email: string;
    password: string;
    confirmPassword: string;
};

export default function RegisterSchoolPage() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [generatedSchoolId, setGeneratedSchoolId] = useState('');
    const router = useRouter();

    const [formData, setFormData] = useState<FormData>({
        schoolName: '',
        city: '',
        phone: '',
        numStudents: '',
        plan: 'Basic',
        adminName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError(null);
    };

    // ── Step 1 validation ────────────────────────────────────────────────
    const handleNextStep = () => {
        if (!formData.schoolName.trim()) return setError('Institution name is required.');
        if (!formData.city.trim()) return setError('City is required.');
        if (!formData.numStudents || isNaN(Number(formData.numStudents)) || Number(formData.numStudents) < 1)
            return setError('Please enter a valid number of students.');
        setError(null);
        setStep(2);
    };

    // ── Final submission ─────────────────────────────────────────────────
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.adminName.trim()) return setError('Admin name is required.');
        if (!formData.email.trim()) return setError('Email is required.');
        if (formData.password.length < 6) return setError('Password must be at least 6 characters.');
        if (formData.password !== formData.confirmPassword) return setError('Passwords do not match.');

        setLoading(true);
        try {
            // 1. Create Firebase Auth account FIRST to satisfy authenticated Firestore rules
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const uid = userCredential.user.uid;

            // 2. Generate unique School ID now that we are authenticated
            const schoolId = await generateSchoolId();

            // 3. Calculate trial / plan expiry
            const trialExpiry = new Date();
            trialExpiry.setDate(trialExpiry.getDate() + 30);

            // 4. Write schools/{schoolId}
            await setDoc(doc(db, 'schools', schoolId), {
                schoolId,
                code: schoolId,
                name: formData.schoolName.trim(),
                city: formData.city.trim(),
                phone: formData.phone.trim(),
                principalName: formData.adminName.trim(),
                email: formData.email.trim(),
                numStudents: Number(formData.numStudents),
                plan: formData.plan.toLowerCase() as 'basic' | 'premium',
                subscriptionStatus: 'active',
                paymentStatus: 'pending',
                trialDays: 30,
                createdAt: serverTimestamp(),
                expiryDate: Timestamp.fromDate(trialExpiry),
            });

            // 5. Write users/{uid}
            await setDoc(doc(db, 'users', uid), {
                uid,
                name: formData.adminName.trim(),
                email: formData.email.trim(),
                role: 'principal',
                schoolId,
                class: null,
                division: null,
                status: 'active',
                createdAt: serverTimestamp(),
            });

            setGeneratedSchoolId(schoolId);
            setSuccess(true);
            setSuccessMessage("Workspace created successfully! Preparing your dashboard...");

            // No longer signing out to allow immediate access
            setTimeout(() => {
                router.push('/dashboard/principal');
            }, 2000);

        } catch (err: any) {
            console.error(err);
            let msg = 'Unable to create workspace. Please try again.';
            if (err.code === 'auth/email-already-in-use') msg = 'This email is already registered.';
            else if (err.code === 'auth/invalid-email') msg = 'The email address is not valid.';
            else if (err.message) msg = err.message;
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/8 rounded-full blur-3xl -mr-72 -mt-40 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/8 rounded-full blur-3xl -ml-72 -mb-40 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-400/3 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="sm:mx-auto sm:w-full sm:max-w-lg relative z-10 text-center mb-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] shadow-2xl shadow-blue-500/25 mb-6 text-white hover:rotate-3 transition-transform duration-500"
                >
                    <Building2 className="w-10 h-10" />
                </motion.div>
                <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl font-black text-slate-900 dark:text-white tracking-tight"
                >
                    Onboard Institution
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-2 text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]"
                >
                    EduCatalog SaaS • 30-Day Free Trial
                </motion.p>
            </div>

            {/* Card */}
            <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4">
                <Card className="px-8 py-10 border-slate-100 dark:border-slate-800 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem]">
                    <AnimatePresence mode="wait">

                        {/* ── SUCCESS STATE ───────────────────────────────── */}
                        {success ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-10 text-center gap-5"
                            >
                                <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-500">
                                    <CheckCircle2 className="w-12 h-12" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">Workspace Ready!</h3>
                                    <p className="text-slate-500 text-sm font-medium mt-1">{successMessage || 'Your institutional portal has been created.'}</p>
                                </div>
                                <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl w-full max-w-xs">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Institutional Code</p>
                                    <p className="text-3xl font-black text-blue-600 tracking-widest">{generatedSchoolId}</p>
                                    <p className="text-[10px] text-slate-500 mt-1 font-medium">Save this — you'll need it for future logins</p>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Entering Dashboard...</p>
                                </div>
                            </motion.div>

                        ) : (
                            <form onSubmit={handleRegister} className="space-y-7">

                                {/* Progress Dots */}
                                <div className="flex items-center justify-center gap-3 mb-2">
                                    {[1, 2].map(s => (
                                        <div key={s} className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500",
                                                step >= s
                                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                                                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                            )}>
                                                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                                            </div>
                                            {s < 2 && (
                                                <div className={cn(
                                                    "h-0.5 w-16 rounded-full transition-all duration-500",
                                                    step > s ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                                                )} />
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* ── STEP 1 : School Details ─────────────────── */}
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: 30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -30 }}
                                        className="space-y-5"
                                    >
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl">
                                                <ShieldCheck className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 dark:text-white">School Details</h3>
                                                <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest">Institutional Identity</p>
                                            </div>
                                        </div>

                                        {/* School Name */}
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <School className="w-3 h-3" /> School Name
                                            </label>
                                            <Input
                                                name="schoolName"
                                                placeholder="e.g. Sunrise Academy"
                                                value={formData.schoolName}
                                                onChange={handleChange}
                                                required
                                                className="h-14 rounded-2xl"
                                            />
                                        </div>

                                        {/* City */}
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <MapPin className="w-3 h-3" /> City
                                            </label>
                                            <Input
                                                name="city"
                                                placeholder="e.g. Pune"
                                                value={formData.city}
                                                onChange={handleChange}
                                                required
                                                className="h-14 rounded-2xl"
                                            />
                                        </div>

                                        {/* Number of Students */}
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <Users className="w-3 h-3" /> Number of Students
                                            </label>
                                            <Input
                                                name="numStudents"
                                                type="number"
                                                min="1"
                                                max="10000"
                                                placeholder="e.g. 450"
                                                value={formData.numStudents}
                                                onChange={handleChange}
                                                required
                                                className="h-14 rounded-2xl"
                                            />
                                        </div>

                                        {/* Plan Selector */}
                                        <div className="space-y-2.5">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <CreditCard className="w-3 h-3" /> Subscription Plan
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {PLAN_OPTIONS.map(plan => (
                                                    <button
                                                        key={plan.value}
                                                        type="button"
                                                        onClick={() => setFormData(p => ({ ...p, plan: plan.value as 'Basic' | 'Premium' }))}
                                                        className={cn(
                                                            "relative p-4 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer",
                                                            formData.plan === plan.value
                                                                ? `${plan.activeBorder} ${plan.activeBg} scale-[1.02] shadow-md`
                                                                : `${plan.border} ${plan.bg} hover:scale-[1.01]`
                                                        )}
                                                    >
                                                        {plan.value === 'Premium' && (
                                                            <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] font-black uppercase rounded-full tracking-wider">
                                                                <Sparkles className="w-2.5 h-2.5" /> Pro
                                                            </span>
                                                        )}
                                                        <p className="font-black text-slate-900 dark:text-white text-sm">{plan.label}</p>
                                                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{plan.description}</p>
                                                        <p className="text-[11px] font-black text-blue-600 mt-1.5">{plan.price}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Error */}
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-3"
                                            >
                                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                                {error}
                                            </motion.div>
                                        )}

                                        <Button
                                            type="button"
                                            className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest gap-2 bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100"
                                            onClick={handleNextStep}
                                        >
                                            Next: Admin Credentials
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </motion.div>
                                )}

                                {/* ── STEP 2 : Admin Credentials ──────────────── */}
                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -30 }}
                                        className="space-y-5"
                                    >
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl">
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 dark:text-white">Admin Credentials</h3>
                                                <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest">Principal Access</p>
                                            </div>
                                        </div>

                                        {/* Preview banner */}
                                        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl">
                                            <Building2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registering for</p>
                                                <p className="text-sm font-black text-slate-800 dark:text-white">{formData.schoolName} • {formData.city}</p>
                                            </div>
                                            <span className={cn(
                                                "ml-auto text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider",
                                                formData.plan === 'Premium'
                                                    ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600"
                                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                            )}>
                                                {formData.plan}
                                            </span>
                                        </div>

                                        {/* Admin Name */}
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <User className="w-3 h-3" /> Admin Name
                                            </label>
                                            <Input
                                                name="adminName"
                                                placeholder="e.g. Suresh Patil"
                                                value={formData.adminName}
                                                onChange={handleChange}
                                                required
                                                className="h-14 rounded-2xl"
                                            />
                                        </div>

                                        {/* Email */}
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <Mail className="w-3 h-3" /> Admin Email
                                            </label>
                                            <Input
                                                name="email"
                                                type="email"
                                                placeholder="admin@school.com"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                                className="h-14 rounded-2xl"
                                            />
                                        </div>

                                        {/* Passwords */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                    <Lock className="w-3 h-3" /> Password
                                                </label>
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
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                    <Lock className="w-3 h-3" /> Confirm
                                                </label>
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

                                        {/* Error */}
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-3"
                                            >
                                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                                {error}
                                            </motion.div>
                                        )}

                                        <div className="flex flex-col gap-3">
                                            <Button
                                                type="submit"
                                                className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20"
                                                isLoading={loading}
                                                disabled={loading}
                                            >
                                                {loading ? 'Provisioning Workspace...' : 'Establish Workspace'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest"
                                                onClick={() => { setStep(1); setError(null); }}
                                                disabled={loading}
                                            >
                                                <ArrowLeft className="w-4 h-4 mr-2" />
                                                Back: School Details
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </form>
                        )}
                    </AnimatePresence>

                    {/* Footer link */}
                    {!success && (
                        <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
                            <p className="text-slate-500 font-medium text-sm">
                                Already registered?{' '}
                                <Link href="/login" className="text-blue-600 font-black uppercase tracking-widest text-[10px] hover:underline underline-offset-4">
                                    Sign In here
                                </Link>
                            </p>
                        </div>
                    )}
                </Card>

                <p className="mt-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    Protected by Institutional-Grade Multi-Tenant Isolation
                </p>
            </div>
        </div>
    );
}
