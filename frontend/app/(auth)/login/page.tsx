'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // If user was redirected from a protected page, we redirect back after login
  const redirectTo = searchParams.get('redirect') || null;

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);

  // ─── Role-based redirect after login ────────────────────────────────────────
  function getRedirectPath(role: string): string {
    if (redirectTo) return redirectTo;
    switch (role) {
      case 'super_admin':
      case 'admin':
      case 'editor':
        return '/admin/dashboard';
      case 'viewer':
        return '/admin/analytics';
      default:
        return '/dashboard';
    }
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Always show a generic message — never reveal if email or password
        // specifically was wrong (prevents user enumeration attacks)
        setFailedAttempts(f => f + 1);
        setError('Invalid email or password. Please try again.');
        setIsLoading(false);
        return;
      }

      if (!data.session) {
        setError('Login failed. Please try again.');
        setIsLoading(false);
        return;
      }

      // Update last_login timestamp via our backend API
      // (non-blocking — we don't await this)
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me/last-login`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      }).catch(() => {});

      // Get role from user metadata to determine redirect
      const role = data.user?.user_metadata?.role || 'user';
      router.push(getRedirectPath(role));

    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  }

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

        <div className="px-8 py-10">

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mb-4">
              <svg viewBox="0 0 24 24" className="w-8 h-8">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Sign in to your GDGOC-UITU account
            </p>
          </div>

          {/* Redirect notice */}
          {redirectTo && (
            <div className="mb-5 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700 text-center">
              You need to log in to access that page.
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          {/* CAPTCHA notice after 5 failed attempts */}
          {failedAttempts >= 5 && (
            <div className="mb-5 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-700 text-center">
              Too many failed attempts. Please wait a moment before trying again.
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ahmad@example.com"
                autoComplete="email"
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none
                  transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-500 hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full px-4 pr-16 py-2.5 rounded-xl border border-gray-200 text-sm outline-none
                    transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400
                    hover:text-gray-600 font-medium transition-colors"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center
                  ${remember
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300 group-hover:border-blue-400'
                  }`}
                >
                  {remember && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-gray-600">Remember me for 30 days</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || failedAttempts >= 5}
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
                  Signing in...
                </span>
              ) : (
                'Log In'
              )}
            </button>

          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-500 hover:underline font-medium">
              Sign Up
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}