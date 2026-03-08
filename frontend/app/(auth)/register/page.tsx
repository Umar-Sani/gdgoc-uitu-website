'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type PasswordStrength = 'empty' | 'weak' | 'fair' | 'strong';

const SKILL_TAGS = [
  'Flutter', 'AI/ML', 'Web Development', 'Cloud', 'Android',
  'Open Source', 'General', 'Cybersecurity', 'DevOps', 'UI/UX',
];

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
  empty:  { label: '',        color: 'bg-gray-200',   width: 'w-0',    text: 'text-gray-400' },
  weak:   { label: 'Weak',    color: 'bg-red-500',    width: 'w-1/4',  text: 'text-red-500'  },
  fair:   { label: 'Fair',    color: 'bg-yellow-400', width: 'w-2/4',  text: 'text-yellow-500' },
  strong: { label: 'Strong',  color: 'bg-green-500',  width: 'w-full', text: 'text-green-500' },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  // const { signUp } = useAuth(); // uncomment when real auth ready

  // Form state
  const [fullName, setFullName]           = useState('');
  const [email, setEmail]                 = useState('');
  const [username, setUsername]           = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedSkills, setSelectedSkills]   = useState<string[]>([]);
  const [agreedToTerms, setAgreedToTerms]     = useState(false);
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);

  // UI state
  const [isLoading, setIsLoading]             = useState(false);
  const [errors, setErrors]                   = useState<Record<string, string>>({});
  const [usernameStatus, setUsernameStatus]   = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const usernameTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const strength = getPasswordStrength(password);
  const strengthStyle = strengthConfig[strength];

  // ─── Username availability check ────────────────────────────────────────────
  // Debounce: waits 600ms after user stops typing before hitting the API
  useEffect(() => {
    if (!username || username.length < 3) {
        setUsernameStatus('idle');
        return;
    }
    setUsernameStatus('checking');
    if (usernameTimeout.current) clearTimeout(usernameTimeout.current);

    usernameTimeout.current = setTimeout(async () => {
        try {
        const { data, error } = await supabase
          .schema('users')
          .from('users')
          .select('username')
          .eq('username', username.toLowerCase())
          .maybeSingle();

        if (error) {
            console.error('Username check error:', error.message);
            setUsernameStatus('idle');
            return;
        }

        setUsernameStatus(data ? 'taken' : 'available');
        } catch {
        setUsernameStatus('idle');
        }
    }, 600);

    return () => {
        if (usernameTimeout.current) clearTimeout(usernameTimeout.current);
    };
    }, [username]);

    // Check email availability
    useEffect(() => {
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

        const timeout = setTimeout(async () => {
            try {
            const { data } = await supabase
              .schema('users')
              .from('users')
              .select('email')
              .eq('email', email.toLowerCase())
              .maybeSingle();

            if (data) {
                setErrors(prev => ({ ...prev, email: 'An account with this email already exists.' }));
            } else {
                setErrors(prev => {
                const updated = { ...prev };
                delete updated.email;
                return updated;
                });
            }
            } catch {
            // ignore
            }
        }, 600);

        return () => clearTimeout(timeout);
        }, [email]);

    // ─── Skill tag toggle ───────────────────────────────────────────────────────
    function toggleSkill(skill: string) {
        setSelectedSkills(prev =>
        prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
        );
    }

  // ─── Validation ─────────────────────────────────────────────────────────────
  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim())
        newErrors.fullName = 'Full name is required.';

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        newErrors.email = 'A valid email address is required.';
    
    if (errors.email)
        newErrors.email = errors.email;

    if (!username.trim() || username.length < 3)
        newErrors.username = 'Username must be at least 3 characters.';

    if (errors.username)
        newErrors.username = errors.username;
    // ADD THIS CHECK
    if (usernameStatus === 'taken')
        newErrors.username = 'This username is already taken.';

    // ADD THIS CHECK — block if still checking
    if (usernameStatus === 'checking')
        newErrors.username = 'Please wait, checking username availability...';

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

    if (!agreedToTerms)
        newErrors.terms = 'You must agree to the Terms of Service.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
    }

  // ─── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);

    try {
        if (usernameStatus === 'taken') {
            setErrors({ username: 'This username is already taken.' });
            setIsLoading(false);
            return;
        }
      // Supabase Auth signUp — stores metadata alongside the auth record.
      // The auth sync trigger (already deployed) will auto-create the
      // users.users record with full_name and skill_tags from metadata.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            username: username.trim().toLowerCase(),
            skill_tags: selectedSkills,
          },
        },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes('already') ||
          error.message.toLowerCase().includes('registered') ||
          error.message.toLowerCase().includes('duplicate')
        ) {
          setErrors({ email: 'An account with this email already exists.' });
        } else {
          setErrors({ general: error.message });
        }
        return;
      }

      // Supabase returns a user with no session when email already exists
      // data.user exists but data.session is null — this means duplicate email
      if (data.user && !data.session) {
        setErrors({ email: 'An account with this email already exists. Please log in instead.' });
        return;
      }

      // Genuine new registration — has both user and session (or awaiting verification)
      if (data.user) {
        sessionStorage.setItem('registration_email', email);
        router.push('/register/success');
        return;
      }

      // Fallback
      setErrors({ general: 'Something went wrong. Please try again.' });

    } catch (err) {
      setErrors({ general: 'Something went wrong. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4 py-12">

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

        {/* Top accent bar — Google colors */}
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
              {/* Google-style G icon */}
              <svg viewBox="0 0 24 24" className="w-8 h-8">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Join GDGOC-UITU
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Create your community account
            </p>
          </div>

          {/* General error banner */}
          {errors.general && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 text-center">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ahmad Ali"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all
                  ${errors.fullName
                    ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                    : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                  }`}
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ahmad@example.com"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all
                  ${errors.email
                    ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                    : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                  }`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Username <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase())}
                  placeholder="ahmadali"
                  className={`w-full pl-8 pr-12 py-2.5 rounded-xl border text-sm outline-none transition-all
                    ${errors.username
                      ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                    }`}
                />
                {/* Live availability indicator */}
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium">
                  {usernameStatus === 'checking'  && <span className="text-gray-400">...</span>}
                  {usernameStatus === 'available' && <span className="text-green-500">✓ Available</span>}
                  {usernameStatus === 'taken'     && <span className="text-red-500">✗ Taken</span>}
                </span>
              </div>
              {errors.username && (
                <p className="mt-1 text-xs text-red-500">{errors.username}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className={`w-full px-4 pr-12 py-2.5 rounded-xl border text-sm outline-none transition-all
                    ${errors.password
                      ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
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
                    {strength === 'weak' && ' — Add uppercase, numbers & symbols'}
                    {strength === 'fair' && ' — Add more variety to strengthen'}
                    {strength === 'strong' && ' — Great password!'}
                  </p>
                </div>
              )}

              {/* Requirements tooltip */}
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
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className={`w-full px-4 pr-12 py-2.5 rounded-xl border text-sm outline-none transition-all
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Skill Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Skill Interests
                <span className="ml-1 text-xs font-normal text-gray-400">(optional — helps us recommend events)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SKILL_TAGS.map(skill => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                      ${selectedSkills.includes(skill)
                        ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                      }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              {selectedSkills.length > 0 && (
                <p className="mt-1.5 text-xs text-blue-500">
                  {selectedSkills.length} selected
                </p>
              )}
            </div>

            {/* Terms */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={e => setAgreedToTerms(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center
                    ${agreedToTerms
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300 group-hover:border-blue-400'
                    }`}
                  >
                    {agreedToTerms && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-600">
                  I agree to the{' '}
                  <Link href="/terms" className="text-blue-500 hover:underline font-medium">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-blue-500 hover:underline font-medium">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {errors.terms && (
                <p className="mt-1 text-xs text-red-500">{errors.terms}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isLoading || usernameStatus === 'taken' || usernameStatus === 'checking' || !!errors.email}
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
                  Creating your account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>

          </form>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-500 hover:underline font-medium">
              Log in
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}