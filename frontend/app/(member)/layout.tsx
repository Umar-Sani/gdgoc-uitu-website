'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    // Google OAuth users who closed the tab before setting a username
    if (!user.username) {
      router.replace('/complete-profile');
    }
  }, [user, loading, router]);

  // Show nothing while auth resolves or while redirecting
  if (loading || !user || !user.username) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-blue-400 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
