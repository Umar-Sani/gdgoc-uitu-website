'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Testimonial = {
  testimonial_id: string;
  user_id: string | null;
  author_name: string;
  author_role: string | null;
  quote: string;
  avatar_url: string | null;
  is_approved: boolean;
  display_order: number;
  created_at: string;
};

export default function TestimonialsCMSPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const emptyForm = { author_name: '', author_role: '', quote: '', display_order: 0, is_approved: false };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => { fetchTestimonials(); }, [token]);

  function fetchTestimonials() {
    if (!token) return;
    setFetching(true);
    fetch(`${API_URL}/api/cms/testimonials/all`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => {
        if (res.error) { setError(`Failed to load: ${res.error}`); return; }
        setTestimonials(res.data ?? []);
      })
      .catch(err => setError(`Network error: ${err.message}`))
      .finally(() => setFetching(false));
  }

  function startEdit(t: Testimonial) {
    setEditing(t.testimonial_id);
    setForm({
      author_name: t.author_name ?? '',
      author_role: t.author_role ?? '',
      quote: t.quote ?? '',
      display_order: t.display_order ?? 0,
      is_approved: t.is_approved ?? false,
    });
    setError('');
    setSuccess('');
  }

  async function handleSave() {
    if (!form.author_name.trim() || !form.quote.trim()) {
      setError('Name and quote are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/cms/testimonials/${editing}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to save.'); return; }
      setSuccess('Saved!');
      setTimeout(() => setSuccess(''), 3000);
      setEditing(null);
      fetchTestimonials();
    } catch {
      setError('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(id: string, approve: boolean) {
    try {
      await fetch(`${API_URL}/api/cms/testimonials/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_approved: approve }),
      });
      fetchTestimonials();
    } catch {
      setError('Failed to update.');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this testimonial?')) return;
    try {
      await fetch(`${API_URL}/api/cms/testimonials/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTestimonials();
    } catch {
      setError('Failed to delete.');
    }
  }

  const pending = testimonials.filter(t => !t.is_approved);
  const approved = testimonials.filter(t => t.is_approved);

  if (loading || fetching) return (
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
            <h1 className="text-2xl font-bold text-gray-900">Testimonials</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {pending.length} pending review · {approved.length} approved
            </p>
          </div>
        </div>

        {success && <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-600">✓ {success}</div>}
        {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>}

        {/* Edit form */}
        {editing && (
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6 mb-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Edit Testimonial</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                <input
                  type="text"
                  value={form.author_name}
                  onChange={e => setForm({ ...form, author_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role / Title</label>
                <input
                  type="text"
                  value={form.author_role}
                  onChange={e => setForm({ ...form, author_role: e.target.value })}
                  placeholder="e.g. Flutter Developer, CS Student"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Quote *</label>
                <textarea
                  value={form.quote}
                  onChange={e => setForm({ ...form, quote: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
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
                    checked={form.is_approved}
                    onChange={e => setForm({ ...form, is_approved: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Approved (visible on site)</span>
                </label>
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
                onClick={() => setEditing(null)}
                className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Pending section */}
        {pending.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-3">
              Pending Review ({pending.length})
            </h2>
            <div className="space-y-3">
              {pending.map(t => (
                <TestimonialRow
                  key={t.testimonial_id}
                  t={t}
                  onEdit={() => startEdit(t)}
                  onApprove={() => handleApprove(t.testimonial_id, true)}
                  onReject={() => handleDelete(t.testimonial_id)}
                  onDelete={() => handleDelete(t.testimonial_id)}
                  isPending
                />
              ))}
            </div>
          </div>
        )}

        {/* Approved section */}
        <div>
          <h2 className="text-xs font-bold text-green-600 uppercase tracking-widest mb-3">
            Approved ({approved.length})
          </h2>
          {approved.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">
              No approved testimonials yet.
            </div>
          ) : (
            <div className="space-y-3">
              {approved.map(t => (
                <TestimonialRow
                  key={t.testimonial_id}
                  t={t}
                  onEdit={() => startEdit(t)}
                  onApprove={() => handleApprove(t.testimonial_id, false)}
                  onDelete={() => handleDelete(t.testimonial_id)}
                  isPending={false}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function TestimonialRow({
  t, onEdit, onApprove, onReject, onDelete, isPending,
}: {
  t: Testimonial;
  onEdit: () => void;
  onApprove: () => void;
  onReject?: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const initials = t.author_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{t.author_name}</p>
          {t.author_role && <span className="text-xs text-gray-400">{t.author_role}</span>}
        </div>
        <p className="text-sm text-gray-600 mt-1 leading-relaxed line-clamp-2 italic">"{t.quote}"</p>
        <p className="text-xs text-gray-400 mt-1">{new Date(t.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      </div>
      <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
        {isPending ? (
          <>
            <button
              onClick={onApprove}
              className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-xs font-semibold text-green-600 hover:bg-green-100 transition-all"
            >
              Approve
            </button>
            <button
              onClick={onReject}
              className="px-3 py-1.5 rounded-lg border border-red-100 text-xs font-medium text-red-500 hover:bg-red-50 transition-all"
            >
              Reject
            </button>
          </>
        ) : (
          <button
            onClick={onApprove}
            className="px-3 py-1.5 rounded-lg border border-orange-100 text-xs font-medium text-orange-500 hover:bg-orange-50 transition-all"
          >
            Unapprove
          </button>
        )}
        <button
          onClick={onEdit}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 rounded-lg border border-red-100 text-xs font-medium text-red-500 hover:bg-red-50 transition-all"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
