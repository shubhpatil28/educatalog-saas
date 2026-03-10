"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        if (profile?.role === 'principal') {
          router.push('/dashboard/principal');
        } else {
          router.push('/dashboard/teacher');
        }
      }
    }
  }, [user, profile, loading, router]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400 font-medium">
      Redirecting...
    </div>
  );
}
