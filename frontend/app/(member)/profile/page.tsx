'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const SKILL_COLORS: Record<string, string> = {
  'Flutter':         'bg-blue-50 text-blue-600 border-blue-100',
  'AI/ML':           'bg-purple-50 text-purple-600 border-purple-100',
  'Web Development': 'bg-green-50 text-green-600 border-green-100',
  'Cloud':           'bg-sky-50 text-sky-600 border-sky-100',
  'Android':         'bg-lime-50 text-lime-600 border-lime-100',
  'Open Source':     'bg-orange-50 text-orange-600 border-orange-100',
  'Cybersecurity':   'bg-red-50 text-red-600 border-red-100',
  'DevOps':          'bg-yellow-50 text-yellow-600 border-yellow-100',
  'UI/UX':           'bg-pink-50 text-pink-600 border-pink-100',
  'General':         'bg-gray-50 text-gray-600 border-gray-100',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function ProfilePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !token) return;

    fetch(`${API_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => setProfile(res.data))
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [user, token]);

  if (loading || !user) return null;

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-10 animate-pulse space-y-4">
          <div className="h-32 bg-white rounded-2xl border border-gray-100" />
          <div className="h-48 bg-white rounded-2xl border border-gray-100" />
        </div>
      </div>
    );
  }

  const data = profile ?? user;

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
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <Link
            href="/profile/edit"
            className="ml-auto px-4 py-2 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all shadow-sm"
          >
            Edit Profile
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
              {data.avatar_url ? (
                <img src={data.avatar_url} alt={data.full_name} className="w-20 h-20 rounded-2xl object-cover" />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {data.full_name?.charAt(0) ?? 'M'}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{data.full_name}</h2>
              <p className="text-sm text-gray-400">@{data.username}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                  data.role_name === 'super_admin'
                    ? 'bg-red-50 text-red-600 border-red-100'
                    : data.role_name === 'admin'
                    ? 'bg-orange-50 text-orange-600 border-orange-100'
                    : 'bg-blue-50 text-blue-600 border-blue-100'
                }`}>
                  {data.role_name ?? 'member'}
                </span>
                {data.is_verified && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-100">
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {data.bio && (
            <div className="mt-5 pt-5 border-t border-gray-50">
              <p className="text-sm text-gray-600 leading-relaxed">{data.bio}</p>
            </div>
          )}
        </div>

        {/* Skills */}
        {data.skill_tags && data.skill_tags.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Skill Interests</h3>
            <div className="flex flex-wrap gap-2">
              {data.skill_tags.map((tag: string) => (
                <span
                  key={tag}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${SKILL_COLORS[tag] ?? 'bg-gray-50 text-gray-600 border-gray-100'}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Account Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Account Info</h3>
          <div className="space-y-3">
            {[
              { label: 'Email', value: data.email },
              { label: 'Member Since', value: data.created_at ? formatDate(data.created_at) : '—' },
              { label: 'Last Login', value: data.last_login ? formatDate(data.last_login) : '—' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{item.label}</span>
                <span className="text-sm font-medium text-gray-700">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}