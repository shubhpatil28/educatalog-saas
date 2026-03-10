"use client";

import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Button, Input } from '@/components/ui';
import {
    User,
    Bell,
    Lock,
    Monitor,
    ShieldCheck,
    Save,
    Moon,
    Sun
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
    const { profile } = useAuth();

    return (
        <DashboardLayout allowedRoles={['principal', 'teacher']}>
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Account Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your profile, security, and preferences</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Sidebar Tabs (Pseudo) */}
                    <div className="md:col-span-1 space-y-2">
                        {[
                            { name: 'Profile Information', icon: User, active: true },
                            { name: 'Security', icon: Lock },
                            { name: 'Notifications', icon: Bell },
                            { name: 'Appearance', icon: Monitor },
                        ].map((tab) => (
                            <button
                                key={tab.name}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                                    tab.active
                                        ? "bg-white dark:bg-slate-900 shadow-sm text-blue-600 border border-slate-200 dark:border-slate-800"
                                        : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.name}
                            </button>
                        ))}
                    </div>

                    {/* Settings Content */}
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-600" />
                                Personal Details
                            </h3>
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Input label="Full Name" defaultValue={profile?.name || ''} className="flex-1" />
                                    <Input label="Email Address" defaultValue={profile?.email || ''} className="flex-1" disabled />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Input label="Phone Number" placeholder="+x (xxx) xxx-xxxx" className="flex-1" />
                                    {profile?.role === 'teacher' && (
                                        <Input label="Assigned Class" defaultValue={profile?.assignedClass || ''} className="flex-1" disabled />
                                    )}
                                </div>
                                <div className="pt-4">
                                    <Button className="gap-2">
                                        <Save className="w-4 h-4" />
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Lock className="w-5 h-5 text-blue-600" />
                                Change Password
                            </h3>
                            <div className="space-y-4">
                                <Input label="Current Password" type="password" />
                                <Input label="New Password" type="password" />
                                <Input label="Confirm New Password" type="password" />
                                <div className="pt-4">
                                    <Button variant="outline" className="gap-2">
                                        Update Password
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        <Card className="border-red-500/20">
                            <h3 className="text-lg font-bold mb-2 text-red-600">Danger Zone</h3>
                            <p className="text-sm text-slate-500 mb-6">Once you deactivate your account, there is no going back. Please be certain.</p>
                            <Button variant="danger" className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white shadow-none">
                                Deactivate Account
                            </Button>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
