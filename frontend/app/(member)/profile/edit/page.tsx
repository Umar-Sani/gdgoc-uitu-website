'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const SKILL_TAGS = [
  'Flutter', 'AI/ML', 'Web Development', 'Cloud', 'Android',
  'Open Source', 'General', 'Cybersecurity', 'DevOps', 'UI/UX',
];

export default function EditProfilePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [fullName, setFullName]   = useState('');
  const [username, setUsername]   = useState('');
  const [bio, setBio]             = useState('');
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [saving, setSaving]       = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !token) return;

    fetch(`${API_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => {
        if (res.data) {
          setFullName(res.data.full_name ?? '');
          setUsername(res.data.username ?? '');
          setBio(res.data.bio ?? '');
          setSkillTags(res.data.skill_tags ?? []);
        }
      })
      .catch(() => {});
  }, [user, token]);

  function toggleSkill(skill: string) {
    setSkillTags(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  }

  async function handleSave() {
    if (!fullName.trim()) { setError('Full name is required.'); return; }
    if (!username.trim()) { setError('Username is required.'); return; }

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch(`${API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          username: username.trim().toLowerCase(),
          bio: bio.trim() || null,
          skill_tags: skillTags,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Failed to save changes.');
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/profile'), 1500);

    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl border border-gray-200 hover:border-blue-300 transition-all"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">

          {/* Success message */}
          {success && (
            <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-600 text-center">
              ✓ Profile updated! Redirecting...
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Username <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase())}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
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
              <span className="ml-1 text-xs font-normal text-gray-400">(select all that apply)</span>
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

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
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
            ) : 'Save Changes'}
          </button>

        </div>
      </div>
    </div>
  );
}