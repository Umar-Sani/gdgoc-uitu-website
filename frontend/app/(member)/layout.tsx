'use client';

import { useEffect } from 'react';
import Link from 'next/link';
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

  return (
    <div>
      {/* Site navigation strip */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors group"
          >
            {/* Google color bar */}
            <div className="flex h-3.5 w-3.5 rounded-sm overflow-hidden flex-shrink-0">
              <div className="flex-1 bg-[#4285F4]" />
              <div className="flex-1 bg-[#EA4335]" />
              <div className="w-full" style={{ background: 'linear-gradient(to bottom, #FBBC05 50%, #34A853 50%)' }} />
            </div>
            <span className="font-medium">GDGoC UITU</span>
            <svg className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
          <span className="text-xs text-gray-400 font-medium tracking-wide uppercase">Member Area</span>
        </div>
      </div>
      {children}
    </div>
  );
}
