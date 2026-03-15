'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const PLATFORMS = ['instagram', 'twitter', 'linkedin', 'facebook'];

export default function NewSocialPostPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [platform, setPlatform]       = useState('instagram');
  const [caption, setCaption]         = useState('');
  const [hashtags, setHashtags]       = useState('');
  const [tags, setTags]               = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  async function handleSave(status: 'draft' | 'scheduled') {
    if (!caption.trim()) { setError('Caption is required.'); return; }
    if (status === 'scheduled' && !scheduledAt) { setError('Scheduled date is required for scheduling.'); return; }

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/social/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform,
          caption: caption.trim(),
          hashtags: hashtags.split(' ').map(h => h.replace('#', '').trim()).filter(Boolean),
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          scheduled_at: scheduledAt || null,
          status,
        }),
      });

      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to save.'); return; }

      router.push('/admin/social');
    } catch {
      setError('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) return null;

  const charLimit = platform === 'twitter' ? 280 : 2200;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-xl border border-gray-200 hover:border-blue-300 transition-all">
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Post</h1>
            <p className="text-sm text-gray-500 mt-0.5">Draft or schedule a social media post</p>
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">

          {/* Platform */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
            <div className="flex gap-2 flex-wrap">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${
                    platform === p
                      ? 'bg-[#4285F4] text-white border-[#4285F4]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Caption */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">Caption *</label>
              <span className={`text-xs font-medium ${caption.length > charLimit ? 'text-red-500' : 'text-gray-400'}`}>
                {caption.length}/{charLimit}
              </span>
            </div>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              rows={5}
              placeholder={`Write your ${platform} caption...`}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Hashtags
              <span className="ml-1 text-xs font-normal text-gray-400">(space separated)</span>
            </label>
            <input
              type="text"
              value={hashtags}
              onChange={e => setHashtags(e.target.value)}
              placeholder="#gdgoc #uitu #tech"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tags
              <span className="ml-1 text-xs font-normal text-gray-400">(comma separated)</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="flutter, workshop, ai"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Schedule Date
              <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all disabled:opacity-60"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSave('scheduled')}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all shadow-md hover:shadow-blue-200 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Schedule Post'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}