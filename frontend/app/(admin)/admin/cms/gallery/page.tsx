'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function GalleryCMSPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const emptyForm = {
    title: '', media_url: '', media_type: 'image',
    category: '', display_order: 0,
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => { fetchItems(); }, []);

  function fetchItems() {
    fetch(`${API_URL}/api/cms/gallery`)
      .then(r => r.json())
      .then(res => setItems(res.data ?? []))
      .catch(() => {});
  }

  async function handleAdd() {
    if (!form.media_url) { setError('Media URL is required.'); return; }

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/cms/gallery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to add.'); return; }

      setSuccess('Item added!');
      setTimeout(() => setSuccess(''), 3000);
      setAdding(false);
      setForm(emptyForm);
      fetchItems();
    } catch {
      setError('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this gallery item?')) return;
    try {
      await fetch(`${API_URL}/api/cms/gallery/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchItems();
    } catch {
      setError('Failed to delete.');
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-xl border border-gray-200 hover:border-blue-300 transition-all">
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gallery Editor</h1>
            <p className="text-sm text-gray-500 mt-0.5">{items.length} items</p>
          </div>
          <button
            onClick={() => setAdding(true)}
            className="ml-auto px-4 py-2 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all"
          >
            + Add Item
          </button>
        </div>

        {success && <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-600">✓ {success}</div>}
        {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>}

        {/* Add Form */}
        {adding && (
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6 mb-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Add Gallery Item</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Media URL *</label>
                <input
                  type="text"
                  value={form.media_url}
                  onChange={e => setForm({ ...form, media_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. events, workshop"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Media Type</label>
                <select
                  value={form.media_type}
                  onChange={e => setForm({ ...form, media_type: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Order</label>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={e => setForm({ ...form, display_order: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleAdd}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all disabled:opacity-60"
              >
                {saving ? 'Adding...' : 'Add Item'}
              </button>
              <button
                onClick={() => { setAdding(false); setForm(emptyForm); }}
                className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Gallery Grid */}
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-gray-400 text-sm">No gallery items yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {items.map(item => (
              <div key={item.item_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="h-40 bg-gray-100 flex items-center justify-center">
                  {item.media_type === 'image' ? (
                    <img src={item.media_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{item.title || 'Untitled'}</p>
                    <p className="text-xs text-gray-400">{item.category || item.media_type}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(item.item_id)}
                    className="ml-2 p-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-all flex-shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
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