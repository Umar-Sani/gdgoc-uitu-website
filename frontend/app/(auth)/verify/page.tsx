'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type VerifyState = 'loading' | 'success' | 'expired' | 'already_verified' | 'error';

export default function VerifyPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [state, setState]       = useState<VerifyState>('loading');
  const [countdown, setCountdown] = useState(5);

  // ─── Run verification on mount ───────────────────────────────────────────────
  // Supabase automatically handles the token in the URL hash/query params.
  // We just need to call getSession() after the redirect — Supabase SDK
  // picks up the token from the URL and exchanges it automatically.
  useEffect(() => {
    async function verify() {
        try {
        // Listen for the SIGNED_IN event which fires when Supabase
        // processes the token from the email link URL hash
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                if (session?.user?.email_confirmed_at) {
                subscription.unsubscribe();
                setState('success');
                }
            }
            }
        );

        // Also check existing session in case page was refreshed
        await new Promise(resolve => setTimeout(resolve, 1500));
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user?.email_confirmed_at) {
            setState('success');
        } else {
            setState('expired');
        }

        } catch {
        setState('error');
        }
    }

    verify();
    }, []);

  // ─── Auto-redirect countdown on success ─────────────────────────────────────
  useEffect(() => {
    if (state !== 'success') return;
    if (countdown <= 0) {
      router.push('/dashboard');
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [state, countdown, router]);

  // ─── Render states ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

        {/* Google color accent bar */}
        <div className="h-1.5 w-full flex">
          <div className="flex-1 bg-[#4285F4]" />
          <div className="flex-1 bg-[#EA4335]" />
          <div className="flex-1 bg-[#FBBC05]" />
          <div className="flex-1 bg-[#34A853]" />
        </div>

        <div className="px-8 py-12 text-center">

          {/* ── LOADING ── */}
          {state === 'loading' && (
            <div className="space-y-5">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50">
                <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Verifying your email...</h1>
                <p className="mt-2 text-sm text-gray-500">Please wait, this only takes a moment.</p>
              </div>
              {/* Shimmer bar */}
              <div className="w-48 mx-auto h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {state === 'success' && (
            <div className="space-y-5">
              {/* Animated checkmark */}
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 relative">
                <div className="absolute inset-0 rounded-full border-4 border-green-200 animate-ping opacity-20" />
                <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Email Verified!
                </h1>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  Your account is now fully active. Welcome to the GDGOC-UITU community!
                </p>
              </div>

              {/* Auto redirect notice */}
              <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                <p className="text-sm text-green-700">
                  Redirecting to your dashboard in{' '}
                  <span className="font-bold text-green-800">{countdown}</span> seconds...
                </p>
                {/* Progress bar */}
                <div className="mt-2 h-1 w-full bg-green-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-1000"
                    style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                  />
                </div>
              </div>

              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 px-6 rounded-xl bg-[#4285F4] hover:bg-blue-600
                  text-white font-semibold text-sm transition-all duration-200
                  shadow-md hover:shadow-lg hover:shadow-blue-200"
              >
                Go to Dashboard Now
              </button>
            </div>
          )}

          {/* ── EXPIRED TOKEN ── */}
          {state === 'expired' && (
            <div className="space-y-5">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-50">
                <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Link Expired
                </h1>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  This verification link is no longer valid. Links expire after <strong>24 hours</strong> for security.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-100 text-left">
                <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-2">What to do</p>
                <p className="text-sm text-yellow-700">
                  Request a new verification link from the registration success page and check your email again.
                </p>
              </div>

              <Link
                href="/register/success"
                className="block w-full py-3 px-6 rounded-xl bg-[#FBBC05] hover:bg-yellow-500
                  text-gray-900 font-semibold text-sm transition-all duration-200
                  shadow-md hover:shadow-lg text-center"
              >
                Request New Verification Link
              </Link>

              <Link href="/login" className="block text-sm text-gray-400 hover:text-gray-600 transition-colors">
                ← Back to Login
              </Link>
            </div>
          )}

          {/* ── ALREADY VERIFIED ── */}
          {state === 'already_verified' && (
            <div className="space-y-5">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50">
                <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Already Verified
                </h1>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  Your email has already been verified. You can log in to your account.
                </p>
              </div>

              <Link
                href="/login"
                className="block w-full py-3 px-6 rounded-xl bg-[#4285F4] hover:bg-blue-600
                  text-white font-semibold text-sm transition-all duration-200
                  shadow-md hover:shadow-lg hover:shadow-blue-200 text-center"
              >
                Log In
              </Link>
            </div>
          )}

          {/* ── GENERIC ERROR ── */}
          {state === 'error' && (
            <div className="space-y-5">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Something Went Wrong
                </h1>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  We couldn't verify your email. The link may be invalid or already used.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href="/register/success"
                  className="block w-full py-3 px-6 rounded-xl bg-[#4285F4] hover:bg-blue-600
                    text-white font-semibold text-sm transition-all duration-200
                    shadow-md hover:shadow-blue-200 text-center"
                >
                  Request New Verification Link
                </Link>
                <Link
                  href="/login"
                  className="block w-full py-3 px-6 rounded-xl border border-gray-200
                    text-gray-600 hover:border-blue-300 hover:text-blue-600
                    font-semibold text-sm transition-all duration-200 text-center"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}