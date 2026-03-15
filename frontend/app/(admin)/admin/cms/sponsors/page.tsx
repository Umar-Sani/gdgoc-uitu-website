'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const TIERS = ['platinum', 'gold', 'silver', 'bronze'];

export default function SponsorsCMSPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [sponsors, setSponsors] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const emptyForm = {
    name: '', logo_url: '', website_url: '',
    tier: 'bronze', description: '', display_order: 0, is_active: true,
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => { fetchSponsors(); }, []);

  function fetchSponsors() {
    fetch(`${API_URL}/api/cms/sponsors`)
      .then(r => r.json())
      .then(res => setSponsors(res.data ?? []))
      .catch(() => {});
  }

  function startEdit(sponsor: any) {
    setEditing(sponsor.sponsor_id);
    setAdding(false);
    setForm({
      name: sponsor.name ?? '',
      logo_url: sponsor.logo_url ?? '',
      website_url: sponsor.website_url ?? '',
      tier: sponsor.tier ?? 'bronze',
      description: sponsor.description ?? '',
      display_order: sponsor.display_order ?? 0,
      is_active: sponsor.is_active ?? true,
    });
  }

  async function handleSave() {
    if (!form.name) { setError('Name is required.'); return; }

    setSaving(true);
    setError('');

    try {
      const url = adding
        ? `${API_URL}/api/cms/sponsors`
        : `${API_URL}/api/cms/sponsors/${editing}`;

      const res = await fetch(url, {
        method: adding ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to save.'); return; }

      setSuccess(adding ? 'Sponsor added!' : 'Sponsor updated!');
      setTimeout(() => setSuccess(''), 3000);
      setAdding(false);
      setEditing(null);
      fetchSponsors();
    } catch {
      setError('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this sponsor?')) return;
    try {
      await fetch(`${API_URL}/api/cms/sponsors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchSponsors();
    } catch {
      setError('Failed to delete.');
    }
  }

  const tierColors: Record<string, string> = {
    platinum: 'bg-purple-50 text-purple-600 border-purple-100',
    gold: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    silver: 'bg-gray-50 text-gray-600 border-gray-200',
    bronze: 'bg-orange-50 text-orange-600 border-orange-100',
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Sponsors Editor</h1>
            <p className="text-sm text-gray-500 mt-0.5">{sponsors.length} sponsors</p>
          </div>
          <button
            onClick={() => { setAdding(true); setEditing(null); setForm(emptyForm); }}
            className="ml-auto px-4 py-2 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all"
          >
            + Add Sponsor
          </button>
        </div>

        {success && <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-600">✓ {success}</div>}
        {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>}

        {/* Add/Edit Form */}
        {(adding || editing) && (
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6 mb-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">{adding ? 'Add Sponsor' : 'Edit Sponsor'}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tier</label>
                <select
                  value={form.tier}
                  onChange={e => setForm({ ...form, tier: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  {TIERS.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo URL</label>
                <input
                  type="text"
                  value={form.logo_url}
                  onChange={e => setForm({ ...form, logo_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Website URL</label>
                <input
                  type="text"
                  value={form.website_url}
                  onChange={e => setForm({ ...form, website_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
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
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => { setAdding(false); setEditing(null); }}
                className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Sponsors List */}
        <div className="space-y-3">
          {sponsors.map(sponsor => (
            <div key={sponsor.sponsor_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                {sponsor.logo_url ? (
                  <img src={sponsor.logo_url} alt={sponsor.name} className="w-10 h-10 object-contain" />
                ) : (
                  <span className="text-lg font-bold text-gray-300">{sponsor.name?.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{sponsor.name}</p>
                <p className="text-xs text-gray-400">{sponsor.website_url || 'No website'}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${tierColors[sponsor.tier] ?? ''}`}>
                {sponsor.tier}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(sponsor)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(sponsor.sponsor_id)}
                  className="px-3 py-1.5 rounded-lg border border-red-100 text-xs font-medium text-red-500 hover:bg-red-50 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}