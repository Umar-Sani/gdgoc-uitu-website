'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type PageState = 'form' | 'success' | 'invalid_token';
type PasswordStrength = 'empty' | 'weak' | 'fair' | 'strong';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return 'empty';
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return 'weak';
  if (score === 2 || score === 3) return 'fair';
  return 'strong';
}

const strengthConfig = {
  empty:  { label: '',       color: 'bg-gray-200',   width: 'w-0',    text: 'text-gray-400'   },
  weak:   { label: 'Weak',   color: 'bg-red-500',    width: 'w-1/4',  text: 'text-red-500'    },
  fair:   { label: 'Fair',   color: 'bg-yellow-400', width: 'w-2/4',  text: 'text-yellow-500' },
  strong: { label: 'Strong', color: 'bg-green-500',  width: 'w-full', text: 'text-green-500'  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const router = useRouter();

  const [pageState, setPageState]     = useState<PageState>('form');
  const [isLoading, setIsLoading]     = useState(false);
  const [isValidating, setIsValidating] = useState(true);

  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [errors, setErrors]               = useState<Record<string, string>>({});

  const strength      = getPasswordStrength(password);
  const strengthStyle = strengthConfig[strength];

  // ─── Validate token on mount ─────────────────────────────────────────────────
  // Supabase automatically picks up the token from the URL hash when the
  // user clicks the reset link in their email. We check the session to
  // confirm the token is valid before showing the form.
  useEffect(() => {
    async function validateToken() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          setPageState('invalid_token');
        }
        // If session exists, the token is valid — show the form
      } catch {
        setPageState('invalid_token');
      } finally {
        setIsValidating(false);
      }
    }

    validateToken();
  }, []);

  // ─── Validation ──────────────────────────────────────────────────────────────
  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!password || password.length < 8)
      newErrors.password = 'Password must be at least 8 characters.';

    if (!/[A-Z]/.test(password))
      newErrors.password = 'Password must include at least one uppercase letter.';

    if (!/[0-9]/.test(password))
      newErrors.password = 'Password must include at least one number.';

    if (!/[^A-Za-z0-9]/.test(password))
      newErrors.password = 'Password must include at least one special character.';

    if (password !== confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      // Supabase updateUser sets the new password for the currently
      // authenticated session (established via the reset token in the URL)
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        if (error.message.toLowerCase().includes('same password')) {
          setErrors({ password: 'New password must be different from your current password.' });
        } else {
          setErrors({ general: error.message });
        }
        return;
      }

      // Sign out after password reset so user logs in fresh
      await supabase.auth.signOut();
      setPageState('success');

    } catch {
      setErrors({ general: 'Something went wrong. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Validating token — show spinner ─────────────────────────────────────────
  if (isValidating) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="h-1.5 w-full flex">
            <div className="flex-1 bg-[#4285F4]" />
            <div className="flex-1 bg-[#EA4335]" />
            <div className="flex-1 bg-[#FBBC05]" />
            <div className="flex-1 bg-[#34A853]" />
          </div>
          <div className="px-8 py-12 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50">
              <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
            <p className="text-sm text-gray-500">Validating your reset link...</p>
          </div>
        </div>
      </div>
    );
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

          {/* ── FORM STATE ── */}
          {pageState === 'form' && (
            <>
              {/* Header */}
              <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mb-4">
                  <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Set a New Password
                </h1>
                <p className="text-sm text-gray-500 mt-1.5">
                  Choose a strong password for your account.
                </p>
              </div>

              {/* General error */}
              {errors.general && (
                <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 text-center">
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-5">

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      autoFocus
                      className={`w-full px-4 pr-16 py-2.5 rounded-xl border text-sm outline-none transition-all
                        ${errors.password
                          ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                          : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-medium"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  {/* Strength meter */}
                  {password && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${strengthStyle.color} ${strengthStyle.width}`} />
                      </div>
                      <p className={`text-xs mt-1 font-medium ${strengthStyle.text}`}>
                        {strengthStyle.label}
                        {strength === 'weak'   && ' — Add uppercase, numbers & symbols'}
                        {strength === 'fair'   && ' — Add more variety to strengthen'}
                        {strength === 'strong' && ' — Great password!'}
                      </p>
                    </div>
                  )}

                  <p className="mt-1 text-xs text-gray-400">
                    Must include uppercase, number, and special character (!@#$%)
                  </p>

                  {errors.password && (
                    <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className={`w-full px-4 pr-16 py-2.5 rounded-xl border text-sm outline-none transition-all
                        ${errors.confirmPassword
                          ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                          : confirmPassword && confirmPassword === password
                            ? 'border-green-400 bg-green-50'
                            : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-medium"
                    >
                      {showConfirm ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Submit */}
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
                      Updating password...
                    </span>
                  ) : (
                    'Set Password'
                  )}
                </button>

              </form>
            </>
          )}

          {/* ── SUCCESS STATE ── */}
          {pageState === 'success' && (
            <div className="text-center space-y-5">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 relative">
                <div className="absolute inset-0 rounded-full border-4 border-green-200 animate-ping opacity-20" />
                <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Password Updated!
                </h1>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  Your password has been successfully reset. You can now log in with your new password.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                <p className="text-sm text-green-700">
                  For security, you have been signed out of all devices.
                </p>
              </div>

              <Link
                href="/login"
                className="block w-full py-3 px-6 rounded-xl bg-[#4285F4] hover:bg-blue-600
                  text-white font-semibold text-sm transition-all duration-200
                  shadow-md hover:shadow-lg hover:shadow-blue-200 text-center"
              >
                Log In Now
              </Link>
            </div>
          )}

          {/* ── INVALID TOKEN STATE ── */}
          {pageState === 'invalid_token' && (
            <div className="text-center space-y-5">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Link Invalid or Expired
                </h1>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  This password reset link is no longer valid. Links expire after <strong>1 hour</strong> and can only be used once.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href="/forgot-password"
                  className="block w-full py-3 px-6 rounded-xl bg-[#4285F4] hover:bg-blue-600
                    text-white font-semibold text-sm transition-all duration-200
                    shadow-md hover:shadow-blue-200 text-center"
                >
                  Request New Reset Link
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