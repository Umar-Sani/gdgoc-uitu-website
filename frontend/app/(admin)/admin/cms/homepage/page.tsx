'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function HomepageCMSPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    fetch(`${API_URL}/api/cms/homepage`)
      .then(r => r.json())
      .then(res => setData(res.data ?? {}))
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch(`${API_URL}/api/cms/homepage`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to save.'); return; }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-xl border border-gray-200 hover:border-blue-300 transition-all">
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Homepage Editor</h1>
            <p className="text-sm text-gray-500 mt-0.5">Edit hero section and stats</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="ml-auto px-5 py-2 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {success && <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-600">✓ Changes saved successfully!</div>}
        {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>}

        <div className="space-y-4">

          {/* Hero Section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Hero Section</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Hero Title</label>
                <input
                  type="text"
                  value={data.hero_title ?? ''}
                  onChange={e => setData({ ...data, hero_title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Hero Subtitle</label>
                <textarea
                  value={data.hero_subtitle ?? ''}
                  onChange={e => setData({ ...data, hero_subtitle: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">CTA Button Text</label>
                  <input
                    type="text"
                    value={data.hero_cta_text ?? ''}
                    onChange={e => setData({ ...data, hero_cta_text: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">CTA Button URL</label>
                  <input
                    type="text"
                    value={data.hero_cta_url ?? ''}
                    onChange={e => setData({ ...data, hero_cta_url: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Stats</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'stats_members', label: 'Members' },
                { key: 'stats_events', label: 'Events' },
                { key: 'stats_projects', label: 'Projects' },
              ].map(stat => (
                <div key={stat.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{stat.label}</label>
                  <input
                    type="number"
                    value={data[stat.key] ?? ''}
                    onChange={e => setData({ ...data, [stat.key]: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Announcement */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Announcement Banner</h2>
            <textarea
              value={data.announcement ?? ''}
              onChange={e => setData({ ...data, announcement: e.target.value })}
              rows={2}
              placeholder="Leave empty to hide announcement banner..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
            />
          </div>

        </div>
      </div>
    </div>
  );
}