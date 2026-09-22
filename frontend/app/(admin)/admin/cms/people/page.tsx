'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ImageUpload from '@/components/ui/ImageUpload';
import { cldUrl, CLD_AVATAR } from '@/lib/cloudinary-url';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const emptyForm = {
  full_name:     '',
  default_role:  '',
  bio:           '',
  avatar_url:    '',
  linkedin_url:  '',
  organization:  '',
  display_order: 0,
};

export default function PeopleCMSPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [people, setPeople]     = useState<any[]>([]);
  const [editing, setEditing]   = useState<string | null>(null);
  const [adding, setAdding]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [form, setForm]         = useState(emptyForm);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => { fetchPeople(); }, []);

  function fetchPeople() {
    fetch(`${API_URL}/api/cms/people?all=true`)
      .then((r) => r.json())
      .then((res) => setPeople(res.data ?? []))
      .catch(() => {});
  }

  function startEdit(person: any) {
    setEditing(person.person_id);
    setAdding(false);
    setError('');
    setForm({
      full_name:     person.full_name ?? '',
      default_role:  person.default_role ?? '',
      bio:           person.bio ?? '',
      avatar_url:    person.avatar_url ?? '',
      linkedin_url:  person.linkedin_url ?? '',
      organization:  person.organization ?? '',
      display_order: person.display_order ?? 0,
    });
  }

  function startAdd() {
    setAdding(true);
    setEditing(null);
    setError('');
    setForm(emptyForm);
  }

  function cancelForm() {
    setAdding(false);
    setEditing(null);
    setError('');
  }

  function handleField(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.full_name.trim()) {
      setError('Full name is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        full_name:     form.full_name.trim(),
        default_role:  form.default_role.trim() || null,
        bio:           form.bio.trim() || null,
        avatar_url:    form.avatar_url.trim() || null,
        linkedin_url:  form.linkedin_url.trim() || null,
        organization:  form.organization.trim() || null,
        display_order: Number(form.display_order),
      };

      const url    = adding ? `${API_URL}/api/cms/people` : `${API_URL}/api/cms/people/${editing}`;
      const method = adding ? 'POST' : 'PATCH';

      const res  = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to save.'); return; }

      setSuccess(adding ? 'Person added!' : 'Person updated!');
      setTimeout(() => setSuccess(''), 3000);
      cancelForm();
      fetchPeople();
    } catch {
      setError('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string, name: string) {
    if (!confirm(`Deactivate "${name}"? They'll stay attached to any events they're already part of, but won't show up in the public catalog or the event-attach picker anymore.`)) return;
    try {
      await fetch(`${API_URL}/api/cms/people/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchPeople();
    } catch {
      setError('Failed to deactivate.');
    }
  }

  async function handleReactivate(id: string) {
    try {
      await fetch(`${API_URL}/api/cms/people/${id}/reactivate`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchPeople();
    } catch {
      setError('Failed to reactivate.');
    }
  }

  const visiblePeople = showInactive ? people : people.filter((p) => p.is_active);
  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all';

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">People Directory</h1>
            <p className="text-sm text-gray-500 mt-0.5">{people.length} people — speakers, hosts, guests and mentors</p>
          </div>
          <button
            onClick={startAdd}
            className="ml-auto px-4 py-2 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all"
          >
            + Add Person
          </button>
        </div>

        {/* Feedback */}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-600">
            ✓ {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Add / Edit Form */}
        {(adding || editing) && (
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6 mb-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-5">
              {adding ? 'Add New Person' : 'Edit Person'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.full_name} onChange={(e) => handleField('full_name', e.target.value)} className={inputClass} placeholder="Jane Doe" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Role</label>
                <input type="text" value={form.default_role} onChange={(e) => handleField('default_role', e.target.value)} className={inputClass} placeholder="Speaker" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization</label>
                <input type="text" value={form.organization} onChange={(e) => handleField('organization', e.target.value)} className={inputClass} placeholder="Google" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">LinkedIn URL</label>
                <input type="text" value={form.linkedin_url} onChange={(e) => handleField('linkedin_url', e.target.value)} className={inputClass} placeholder="https://linkedin.com/in/..." />
              </div>

              <div>
                <ImageUpload
                  label="Avatar"
                  value={form.avatar_url}
                  onChange={(url) => handleField('avatar_url', url)}
                  token={token}
                  folder="gdgoc-uitu/people"
                  shape="circle"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Order</label>
                <input type="number" value={form.display_order} onChange={(e) => handleField('display_order', Number(e.target.value))} className={inputClass} min={0} />
              </div>

            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => handleField('bio', e.target.value)}
                rows={3}
                placeholder="Short bio or description..."
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all disabled:opacity-60"
              >
                {saving ? 'Saving...' : adding ? 'Add Person' : 'Save Changes'}
              </button>
              <button
                onClick={cancelForm}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Show inactive toggle */}
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => setShowInactive((v) => !v)}
            className={`relative w-10 h-5 rounded-full transition-all ${showInactive ? 'bg-blue-400' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${showInactive ? 'left-5' : 'left-0.5'}`} />
          </button>
          <span className="text-sm text-gray-600">Show deactivated people</span>
        </div>

        {/* List */}
        <div className="space-y-2">
          {visiblePeople.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">
              No people yet. Click "+ Add Person" to get started.
            </div>
          ) : (
            visiblePeople.map((person) => (
              <PersonRow
                key={person.person_id}
                person={person}
                onEdit={() => startEdit(person)}
                onDeactivate={() => handleDeactivate(person.person_id, person.full_name)}
                onReactivate={() => handleReactivate(person.person_id)}
              />
            ))
          )}
        </div>

      </div>
    </div>
  );
}

function PersonRow({
  person,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  person: any;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:border-blue-100 transition-all">

      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {person.avatar_url
          ? <img src={cldUrl(person.avatar_url, CLD_AVATAR) ?? person.avatar_url} alt={person.full_name} className="w-full h-full object-cover" />
          : <span className="text-sm font-bold text-white">{person.full_name?.charAt(0)}</span>
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-800">{person.full_name}</p>
          {person.default_role && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-blue-600 bg-blue-50 uppercase tracking-wide">{person.default_role}</span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{person.organization || '—'}</p>
      </div>

      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${
        person.is_active ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'
      }`}>
        {person.is_active ? 'Active' : 'Inactive'}
      </span>

      <div className="flex gap-2 flex-shrink-0">
        <button onClick={onEdit} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all">
          Edit
        </button>
        {person.is_active ? (
          <button onClick={onDeactivate} className="px-3 py-1.5 rounded-lg border border-red-100 text-xs font-medium text-red-500 hover:bg-red-50 transition-all">
            Deactivate
          </button>
        ) : (
          <button onClick={onReactivate} className="px-3 py-1.5 rounded-lg border border-green-100 text-xs font-medium text-green-600 hover:bg-green-50 transition-all">
            Reactivate
          </button>
        )}
      </div>

    </div>
  );
}
