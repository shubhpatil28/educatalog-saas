"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
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

    const profileUnsubRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);

            // 1. Cleanup existing listener on state change
            if (profileUnsubRef.current) {
                profileUnsubRef.current();
                profileUnsubRef.current = null;
            }

            if (firebaseUser) {
                const userRef = doc(db, 'users', firebaseUser.uid);
                let currentSchoolId: string | null = null;

                // 2. Start single profile listener
                profileUnsubRef.current = onSnapshot(userRef, async (snap) => {
                    if (snap.exists()) {
                        const data = snap.data() as UserProfile;
                        setProfile(data);

                        // Optional: Mark session activity
                        updateDoc(userRef, { lastLogin: serverTimestamp() }).catch(() => {});

                        // 3. Fetch school data if schoolId changes
                        if (data.schoolId && data.schoolId !== currentSchoolId) {
                            currentSchoolId = data.schoolId;
                            try {
                                const schoolSnap = await getDoc(doc(db, 'schools', data.schoolId));
                                if (schoolSnap.exists()) {
                                    setSchool(schoolSnap.data() as SchoolInfo);
                                }
                            } catch (e) {
                                console.error('[Auth] School sync error:', e);
                            }
                        }
                    } else if (firebaseUser) {
                        // User exists in Auth but not in Firestore (Self-Healing)
                        // We set profile to null for now; the LoginPage or RegisterPage will 
                        // attempt to fix this if they have the necessary context (like schoolId).
                        setProfile(null);
                        setSchool(null);
                    }
                    setLoading(false);
                }, (err) => {
                    console.error('[Auth] Profile sync error:', err);
                    setLoading(false);
                });
            } else {
                // Sign out protocol: Purge institutional data immediately
                setProfile(null);
                setSchool(null);
                setLoading(false);
            }
        });

        // 4. Final Cleanup
        return () => {
            unsubscribeAuth();
            if (profileUnsubRef.current) {
                profileUnsubRef.current();
            }
        };
    }, []);

    const isSubscriptionActive = school
        ? school.subscriptionStatus === 'active' &&
          (!school.expiryDate || school.expiryDate.toDate() > new Date())
        : false;

    return (
        <AuthContext.Provider value={{ user, profile, school, loading, isSubscriptionActive }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
