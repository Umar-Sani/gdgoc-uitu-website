'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function TeamCMSPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const emptyForm = {
    full_name: '', role_title: '', bio: '',
    avatar_url: '', linkedin_url: '', github_url: '',
    display_order: 0, is_active: true,
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    fetchMembers();
  }, []);

  function fetchMembers() {
    fetch(`${API_URL}/api/cms/team`)
      .then(r => r.json())
      .then(res => setMembers(res.data ?? []))
      .catch(() => {});
  }

  function startEdit(member: any) {
    setEditing(member.member_id);
    setAdding(false);
    setForm({
      full_name: member.full_name ?? '',
      role_title: member.role_title ?? '',
      bio: member.bio ?? '',
      avatar_url: member.avatar_url ?? '',
      linkedin_url: member.linkedin_url ?? '',
      github_url: member.github_url ?? '',
      display_order: member.display_order ?? 0,
      is_active: member.is_active ?? true,
    });
  }

  function startAdd() {
    setAdding(true);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!form.full_name || !form.role_title) {
      setError('Full name and role title are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const url = adding
        ? `${API_URL}/api/cms/team`
        : `${API_URL}/api/cms/team/${editing}`;

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

      setSuccess(adding ? 'Member added!' : 'Member updated!');
      setTimeout(() => setSuccess(''), 3000);
      setAdding(false);
      setEditing(null);
      fetchMembers();
    } catch {
      setError('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this team member?')) return;

    try {
      await fetch(`${API_URL}/api/cms/team/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchMembers();
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
            <h1 className="text-2xl font-bold text-gray-900">Team Editor</h1>
            <p className="text-sm text-gray-500 mt-0.5">{members.length} team members</p>
          </div>
          <button
            onClick={startAdd}
            className="ml-auto px-4 py-2 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all"
          >
            + Add Member
          </button>
        </div>

        {success && <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-600">✓ {success}</div>}
        {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>}

        {/* Add/Edit Form */}
        {(adding || editing) && (
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6 mb-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">{adding ? 'Add New Member' : 'Edit Member'}</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'full_name', label: 'Full Name *', type: 'text' },
                { key: 'role_title', label: 'Role Title *', type: 'text' },
                { key: 'avatar_url', label: 'Avatar URL', type: 'text' },
                { key: 'linkedin_url', label: 'LinkedIn URL', type: 'text' },
                { key: 'github_url', label: 'GitHub URL', type: 'text' },
                { key: 'display_order', label: 'Display Order', type: 'number' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
                  <input
                    type={field.type}
                    value={(form as any)[field.key]}
                    onChange={e => setForm({ ...form, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
              <textarea
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
              />
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

        {/* Members List */}
        <div className="space-y-3">
          {members.map(member => (
            <div key={member.member_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt={member.full_name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white">{member.full_name?.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{member.full_name}</p>
                <p className="text-xs text-gray-400">{member.role_title}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${member.is_active ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                {member.is_active ? 'Active' : 'Inactive'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(member)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(member.member_id)}
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