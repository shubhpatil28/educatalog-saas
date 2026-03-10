"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile, SchoolInfo } from '@/types';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    school: SchoolInfo | null;
    loading: boolean;
    isSubscriptionActive: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    school: null,
    loading: true,
    isSubscriptionActive: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [school, setSchool] = useState<SchoolInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                // Fetch User Profile
                const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                if (profileDoc.exists()) {
                    const profileData = profileDoc.data() as UserProfile;
                    setProfile(profileData);

                    // Update last login
                    await updateDoc(doc(db, 'users', firebaseUser.uid), {
                        lastLogin: serverTimestamp()
                    });

                    // Fetch School Information
                    if (profileData.schoolId) {
                        const schoolDoc = await getDoc(doc(db, 'schools', profileData.schoolId));
                        if (schoolDoc.exists()) {
                            setSchool(schoolDoc.data() as SchoolInfo);
                        }
                    }
                }
            } else {
                setProfile(null);
                setSchool(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const isSubscriptionActive = school ? (
        school.subscriptionStatus === 'active' &&
        (!school.expiryDate || school.expiryDate.toDate() > new Date())
    ) : false;

    return (
        <AuthContext.Provider value={{ user, profile, school, loading, isSubscriptionActive }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
