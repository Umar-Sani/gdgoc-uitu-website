'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function RegistrationSuccessPage() {
  const router = useRouter();

  // Countdown for the resend button (60 seconds)
  const [countdown, setCountdown]         = useState(60);
  const [canResend, setCanResend]         = useState(false);
  const [resendCount, setResendCount]     = useState(0);
  const [isResending, setIsResending]     = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  // Get the email from sessionStorage (set during registration)
  // Falls back to a masked placeholder if not available
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Retrieve email saved during registration
    const savedEmail = sessionStorage.getItem('registration_email') || '';
    setEmail(savedEmail);
  }, []);

  // ─── Countdown timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // ─── Poll for verification ───────────────────────────────────────────────────
  // Every 30 seconds check if the user has verified their email.
  // If verified, auto-redirect to dashboard.
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        router.push('/dashboard');
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);

  // ─── Mask email for display ──────────────────────────────────────────────────
  function maskEmail(email: string): string {
    if (!email) return 'your email';
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const masked = local[0] + '***';
    return `${masked}@${domain}`;
  }

  // ─── Resend verification email ───────────────────────────────────────────────
  async function handleResend() {
    if (!canResend || resendCount >= 5) return;

    setIsResending(true);
    setResendMessage('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        setResendMessage('Failed to resend. Please try again.');
      } else {
        setResendCount(c => c + 1);
        setResendMessage('Verification email sent!');
        // Reset countdown for next resend
        setCountdown(60);
        setCanResend(false);
      }
    } catch {
      setResendMessage('Something went wrong. Please try again.');
    } finally {
      setIsResending(false);
    }
  }

  const maxResendsReached = resendCount >= 5;

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

        <div className="px-8 py-10 text-center">

          {/* Animated success icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 mb-6 relative">
            {/* Outer ring animation */}
            <div className="absolute inset-0 rounded-full border-4 border-green-200 animate-ping opacity-30" />
            <svg
              className="w-10 h-10 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Account Created!
          </h1>
          <p className="text-lg font-medium text-gray-700 mt-1">
            Check Your Email
          </p>

          {/* Email info */}
          <p className="mt-4 text-sm text-gray-500 leading-relaxed">
            We've sent a verification link to{' '}
            <span className="font-semibold text-gray-700">
              {maskEmail(email)}
            </span>
            . Click the link to activate your account.
          </p>

          {/* Steps */}
          <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-100 text-left space-y-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              Next Steps
            </p>
            {[
              'Open your email inbox',
              'Find the email from GDGOC-UITU',
              'Click the "Verify Email" button',
              'You\'ll be redirected to your dashboard',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-blue-700">{step}</span>
              </div>
            ))}
          </div>

          {/* Expiry notice */}
          <p className="mt-4 text-xs text-gray-400">
            The verification link expires in <strong className="text-gray-500">24 hours</strong>.
          </p>

          {/* Resend section */}
          <div className="mt-6">
            {maxResendsReached ? (
              // Max resends reached — show contact support
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <p className="text-sm text-yellow-700">
                  Too many resend attempts.{' '}
                  <Link href="/contact" className="font-medium underline">
                    Contact Support
                  </Link>
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  Didn't receive the email?
                </p>

                <button
                  onClick={handleResend}
                  disabled={!canResend || isResending}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                    ${canResend && !isResending
                      ? 'bg-[#4285F4] text-white hover:bg-blue-600 shadow-md hover:shadow-blue-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  {isResending ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Sending...
                    </span>
                  ) : canResend ? (
                    'Resend Verification Email'
                  ) : (
                    `Resend in ${countdown}s`
                  )}
                </button>

                {/* Resend feedback message */}
                {resendMessage && (
                  <p className={`text-xs font-medium ${
                    resendMessage.includes('sent')
                      ? 'text-green-500'
                      : 'text-red-500'
                  }`}>
                    {resendMessage}
                  </p>
                )}

                {/* Resend count indicator */}
                {resendCount > 0 && (
                  <p className="text-xs text-gray-400">
                    {5 - resendCount} resend{5 - resendCount !== 1 ? 's' : ''} remaining
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Back to login */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Already verified?{' '}
              <Link href="/login" className="text-blue-500 hover:underline font-medium">
                Log in
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}