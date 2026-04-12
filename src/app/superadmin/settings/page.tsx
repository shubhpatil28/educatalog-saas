"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Shield, Globe, Bell, Save, CheckCircle2, Loader2, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function SuperAdminSettingsPage() {
    const { profile } = useAuth();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // New superadmin form
    const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });
    const [creatingAdmin, setCreatingAdmin] = useState(false);
    const [adminCreated, setAdminCreated] = useState(false);

    const handleCreateSuperAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingAdmin(true);
        setError(null);
        try {
            const cred = await createUserWithEmailAndPassword(auth, newAdmin.email, newAdmin.password);
            await setDoc(doc(db, 'users', cred.user.uid), {
                uid: cred.user.uid,
                name: newAdmin.name,
                email: newAdmin.email,
                role: 'superadmin',
                schoolId: '',
                status: 'Active',
                createdAt: serverTimestamp(),
            });
            setAdminCreated(true);
            setNewAdmin({ name: '', email: '', password: '' });
        } catch (err: any) {
            setError(err.message ?? 'Failed to create admin.');
        } finally {
            setCreatingAdmin(false);
        }
    };

    return (
        <div className="space-y-8 pb-16 max-w-3xl">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Platform Settings</h1>
                <p className="text-slate-500 text-xs uppercase tracking-widest font-medium mt-1">
                    EduCatalog SaaS global configuration
                </p>
            </div>

            {/* Platform Info */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-violet-900/30 rounded-xl text-violet-400"><Globe className="w-5 h-5" /></div>
                    <h3 className="font-black text-white text-sm uppercase tracking-widest">Platform Identity</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { label: 'Platform Name', value: 'EduCatalog' },
                        { label: 'Version', value: 'v2.0 SaaS' },
                        { label: 'Firebase Project', value: 'educatalog-fe7ca' },
                        { label: 'Logged in as', value: profile?.name ?? '—' },
                    ].map(item => (
                        <div key={item.label} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{item.label}</p>
                            <p className="font-black text-white text-sm">{item.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Security notice */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-emerald-900/30 rounded-xl text-emerald-400"><Shield className="w-5 h-5" /></div>
                    <h3 className="font-black text-white text-sm uppercase tracking-widest">Firestore Security Rules</h3>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                    The platform enforces multi-tenant isolation via Firestore security rules. All school data reads and writes require a matching <code className="bg-slate-800 text-violet-400 px-1.5 py-0.5 rounded text-xs">schoolId</code> claim on the auth token.
                </p>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-400 overflow-x-auto whitespace-pre">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Super Admin: full access
    match /{document=**} {
      allow read, write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'superadmin';
    }
    // School-isolated collections
    match /students/{id} {
      allow read, write: if request.auth != null
        && request.auth.uid != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.schoolId == resource.data.schoolId;
    }
    match /attendance/{id} {
      allow read, write: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.schoolId == resource.data.schoolId;
    }
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid
        || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'principal';
    }
    match /schools/{schoolId} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['principal','superadmin'];
    }
  }
}`}
                </div>
                <p className="text-[10px] text-slate-600 font-medium mt-3 uppercase tracking-widest">
                    Deploy these rules in Firebase Console → Firestore → Rules
                </p>
            </div>

            {/* Create New Super Admin */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 bg-violet-900/30 rounded-xl text-violet-400"><UserPlus className="w-5 h-5" /></div>
                    <h3 className="font-black text-white text-sm uppercase tracking-widest">Create Super Admin Account</h3>
                </div>
                {adminCreated ? (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-4 bg-emerald-900/20 border border-emerald-700/30 rounded-xl text-emerald-400 text-sm font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        Super Admin account created successfully!
                    </motion.div>
                ) : (
                    <form onSubmit={handleCreateSuperAdmin} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { key: 'name', label: 'Full Name', type: 'text', placeholder: 'e.g. Platform Owner' },
                                { key: 'email', label: 'Email', type: 'email', placeholder: 'admin@educatalog.io' },
                            ].map(f => (
                                <div key={f.key} className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{f.label}</label>
                                    <input
                                        type={f.type}
                                        placeholder={f.placeholder}
                                        value={(newAdmin as any)[f.key]}
                                        onChange={e => setNewAdmin(p => ({ ...p, [f.key]: e.target.value }))}
                                        required
                                        className="w-full h-12 px-4 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-sm placeholder:text-slate-600 focus:outline-none focus:border-violet-600 transition-colors"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Password</label>
                            <input
                                type="password"
                                placeholder="Min 6 characters"
                                value={newAdmin.password}
                                onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))}
                                required
                                className="w-full h-12 px-4 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-sm placeholder:text-slate-600 focus:outline-none focus:border-violet-600 transition-colors"
                            />
                        </div>
                        {error && (
                            <p className="text-red-400 text-xs font-bold">{error}</p>
                        )}
                        <button type="submit" disabled={creatingAdmin}
                            className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-60">
                            {creatingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                            Create Super Admin
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
