'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [codeExchanged, setCodeExchanged] = useState(false);
  const redirected = useRef(false);

  // Step 1: exchange the code once on mount
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .catch(() => {})  // already exchanged by detectSessionInUrl — that's fine
        .finally(() => setCodeExchanged(true));
    } else {
      setCodeExchanged(true);
    }
  }, []);

  // Step 2: once code is exchanged AND AuthContext has resolved, redirect
  useEffect(() => {
    if (!codeExchanged || loading || redirected.current) return;

    if (user) {
      redirected.current = true;
      // New Google user with no username → profile completion
      router.replace(!user.username ? '/complete-profile' : '/dashboard');
    }
    // user is null but loading is false → onAuthStateChange may still be in-flight
    // the timeout below handles the stuck case
  }, [codeExchanged, loading, user, router]);

  // Fallback: if still stuck after 8s, check the raw session
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (redirected.current) return;
      redirected.current = true;
      const { data: { session } } = await supabase.auth.getSession();
      router.replace(session ? '/dashboard' : '/login');
    }, 8000);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm mb-4">
          <svg className="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500 font-medium">Signing you in...</p>
      </div>
    </div>
  );
}
