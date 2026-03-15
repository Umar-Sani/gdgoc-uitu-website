'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AboutCMSPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [sections, setSections] = useState<any[]>([]);
  const [saving, setSaving] = useState<number | null>(null);
  const [success, setSuccess] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    fetch(`${API_URL}/api/cms/about`)
      .then(r => r.json())
      .then(res => setSections(res.data ?? []))
      .catch(() => {});
  }, []);

  async function handleSave(section: any) {
    setSaving(section.section_id);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/cms/about/${section.section_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: section.title, body: section.body }),
      });

      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to save.'); return; }
      setSuccess(section.section_id);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Something went wrong.');
    } finally {
      setSaving(null);
    }
  }

  function updateSection(id: number, field: string, value: string) {
    setSections(prev => prev.map(s => s.section_id === id ? { ...s, [field]: value } : s));
  }

  if (loading) return (
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
            <h1 className="text-2xl font-bold text-gray-900">About Page Editor</h1>
            <p className="text-sm text-gray-500 mt-0.5">Edit about page sections</p>
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>}

        {sections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-gray-400 text-sm">No sections found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map(section => (
              <div key={section.section_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">{section.section_key}</span>
                  {success === section.section_id && (
                    <span className="text-xs text-green-500 font-medium">✓ Saved!</span>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                    <input
                      type="text"
                      value={section.title ?? ''}
                      onChange={e => updateSection(section.section_id, 'title', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Body</label>
                    <textarea
                      value={section.body ?? ''}
                      onChange={e => updateSection(section.section_id, 'body', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                    />
                  </div>
                  <button
                    onClick={() => handleSave(section)}
                    disabled={saving === section.section_id}
                    className="px-4 py-2 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all disabled:opacity-60"
                  >
                    {saving === section.section_id ? 'Saving...' : 'Save Section'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}