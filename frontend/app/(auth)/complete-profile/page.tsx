'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ImageUpload from '@/components/ui/ImageUpload';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const SKILL_TAGS = [
  'Flutter', 'AI/ML', 'Web Development', 'Cloud', 'Android',
  'Open Source', 'General', 'Cybersecurity', 'DevOps', 'UI/UX',
];

export default function CompleteProfilePage() {
  const router = useRouter();

  // Use Supabase session directly — AuthContext may still be resolving
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const [username, setUsername]   = useState('');
  const [bio, setBio]             = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [skillTags, setSkillTags] = useState<string[]>([]);

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const usernameTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [wantsEmailNotifs, setWantsEmailNotifs] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  // Get session on mount; pre-fill avatar from Google user_metadata
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
        return;
      }
      // If user already has a username in our DB, skip this page
      fetch(`${API_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(r => r.json())
        .then(res => {
          if (res.data?.username) {
            router.replace('/dashboard');
            return;
          }
          // Pre-fill avatar from Google profile
          const googleAvatar = session.user.user_metadata?.avatar_url ?? '';
          setAvatarUrl(googleAvatar);
          setAccessToken(session.access_token);
          setSessionReady(true);
        })
        .catch(() => {
          // Backend unreachable — still show the form
          const googleAvatar = session.user.user_metadata?.avatar_url ?? '';
          setAvatarUrl(googleAvatar);
          setAccessToken(session.access_token);
          setSessionReady(true);
        });
    });
  }, [router]);

  // Username availability check (debounced 600ms)
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    if (usernameTimeout.current) clearTimeout(usernameTimeout.current);

    usernameTimeout.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .schema('users')
          .from('users')
          .select('username')
          .eq('username', username.toLowerCase())
          .maybeSingle();
        setUsernameStatus(data ? 'taken' : 'available');
      } catch {
        setUsernameStatus('idle');
      }
    }, 600);

    return () => {
      if (usernameTimeout.current) clearTimeout(usernameTimeout.current);
    };
  }, [username]);

  function toggleSkill(skill: string) {
    setSkillTags(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  }

  async function handleSave() {
    if (!username.trim() || username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (usernameStatus === 'taken') {
      setError('That username is already taken.');
      return;
    }
    if (usernameStatus === 'checking') {
      setError('Please wait while we check username availability.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          bio: bio.trim() || null,
          avatar_url: avatarUrl || null,
          skill_tags: skillTags,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || 'Failed to save. Please try again.');
        return;
      }

      // Fire-and-forget: save email notification preference
      if (wantsEmailNotifs) {
        fetch(`${API_URL}/api/users/me/preferences`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body:    JSON.stringify({ email_enabled: true }),
        }).catch(() => {});
      }

      router.replace('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!sessionReady) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <svg className="animate-spin h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
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

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-50 mb-4">
              <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Complete Your Profile
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Just one more step — choose a username to get started.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          <div className="space-y-5">

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
                  placeholder="yourname"
                  className="w-full pl-8 pr-20 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium">
                  {usernameStatus === 'checking'  && <span className="text-gray-400">...</span>}
                  {usernameStatus === 'available' && <span className="text-green-500">✓ Available</span>}
                  {usernameStatus === 'taken'     && <span className="text-red-500">✗ Taken</span>}
                </span>
              </div>
            </div>

            {/* Profile Picture */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Profile Picture <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <ImageUpload
                value={avatarUrl}
                onChange={setAvatarUrl}
                token={accessToken}
                folder="gdgoc-uitu/avatars"
                shape="circle"
                previewClass="w-20 h-20 rounded-full"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Bio <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                placeholder="Tell the community a bit about yourself..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
              />
            </div>

            {/* Skill Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Skill Interests
                <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SKILL_TAGS.map(skill => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      skillTags.includes(skill)
                        ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Email notifications opt-in */}
            <label className="flex items-start gap-3 cursor-pointer group select-none">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={wantsEmailNotifs}
                  onChange={e => setWantsEmailNotifs(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 rounded border-2 border-gray-300 bg-white peer-checked:bg-[#4285F4] peer-checked:border-[#4285F4] transition-all flex items-center justify-center">
                  {wantsEmailNotifs && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                  Subscribe to email notifications
                </p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  Get emails for event registrations, replies, and announcements. You can change this anytime in Settings.
                </p>
              </div>
            </label>

            {/* Submit */}
            <button
              onClick={handleSave}
              disabled={saving || usernameStatus === 'taken' || usernameStatus === 'checking'}
              className="w-full py-3 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white font-semibold text-sm transition-all shadow-md hover:shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Saving...
                </span>
              ) : (
                'Continue to Dashboard'
              )}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
