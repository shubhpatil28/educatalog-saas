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

    // Ref to hold the active profile unsubscribe so we can clean it up on sign-out
    const profileUnsubRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
            // Clean up any existing profile listener before switching users
            if (profileUnsubRef.current) {
                profileUnsubRef.current();
                profileUnsubRef.current = null;
            }

            setUser(firebaseUser);

            if (firebaseUser) {
                const userRef = doc(db, 'users', firebaseUser.uid);

                // Use onSnapshot so the profile updates in real-time.
                // This is critical: after registration, the page writes the user
                // doc a moment after auth — onSnapshot picks that up automatically.
                const unsubProfile = onSnapshot(
                    userRef,
                    async (snap) => {
                        if (snap.exists()) {
                            const data = snap.data() as UserProfile;
                            setProfile(data);

                            // Fire-and-forget last-login update (won't block rendering)
                            updateDoc(userRef, { lastLogin: serverTimestamp() }).catch(() => {});

                            // Fetch matching school document
                            if (data.schoolId && data.schoolId !== 'TEMP') {
                                try {
                                    const schoolSnap = await getDoc(doc(db, 'schools', data.schoolId));
                                    if (schoolSnap.exists()) {
                                        setSchool(schoolSnap.data() as SchoolInfo);
                                    } else {
                                        setSchool(null);
                                    }
                                } catch (e) {
                                    console.warn('Failed to fetch school data:', e);
                                    setSchool(null);
                                }
                            } else {
                                setSchool(null);
                            }
                        } else {
                            // Profile not found — login/register page will create it.
                            // Do NOT auto-create with a TEMP schoolId as that
                            // breaks multi-tenant isolation.
                            setProfile(null);
                            setSchool(null);
                        }
                        setLoading(false);
                    },
                    (err) => {
                        console.error('Profile listener error:', err);
                        setProfile(null);
                        setLoading(false);
                    }
                );

                profileUnsubRef.current = unsubProfile;
            } else {
                // Signed out
                setProfile(null);
                setSchool(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (profileUnsubRef.current) profileUnsubRef.current();
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
