'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      // Supabase sends a password reset email if the account exists.
      // We always show the same success message regardless — this prevents
      // email enumeration (attacker can't tell if an email is registered).
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      setSubmitted(true);

    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Success State ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

          <div className="h-1.5 w-full flex">
            <div className="flex-1 bg-[#4285F4]" />
            <div className="flex-1 bg-[#EA4335]" />
            <div className="flex-1 bg-[#FBBC05]" />
            <div className="flex-1 bg-[#34A853]" />
          </div>

          <div className="px-8 py-12 text-center">

            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mb-6">
              <svg className="w-8 h-8 text-[#4285F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-3">Check Your Email</h1>

            <p className="text-sm text-gray-500 leading-relaxed mb-2">
              If an account exists for{' '}
              <span className="font-medium text-gray-700">{email}</span>,
              you will receive a password reset link within a few minutes.
            </p>

            <p className="text-xs text-gray-400 mb-8">
              The link expires in 1 hour. Check your spam folder if you don't see it.
            </p>

            <div className="border-t border-gray-100 pt-6 space-y-3">
              <p className="text-xs text-gray-400">Didn't receive it?</p>
              <button
                onClick={() => { setSubmitted(false); setEmail(''); }}
                className="text-sm text-[#4285F4] hover:underline font-medium"
              >
                Try a different email address
              </button>
            </div>

            <div className="mt-6">
              <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back to Login
              </Link>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ─── Form State ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

        <div className="h-1.5 w-full flex">
          <div className="flex-1 bg-[#4285F4]" />
          <div className="flex-1 bg-[#EA4335]" />
          <div className="flex-1 bg-[#FBBC05]" />
          <div className="flex-1 bg-[#34A853]" />
        </div>

        <div className="px-8 py-10">

          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-yellow-50 mb-4">
              <svg className="w-7 h-7 text-[#FBBC05]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reset Your Password</h1>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
              Enter your email and we'll send you a link to reset your password.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ahmad@example.com"
                autoFocus
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all
                  ${error
                    ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                    : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                  }`}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 rounded-xl bg-[#4285F4] hover:bg-blue-600 active:bg-blue-700
                text-white font-semibold text-sm transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
                shadow-md hover:shadow-lg hover:shadow-blue-200"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Sending reset link...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </button>

          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}