'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const SECTION_OPTIONS = [
  { value: 'gdg_lead',    label: 'GDG Lead' },
  { value: 'co_lead',     label: 'Co-Lead' },
  { value: 'member',      label: 'Team Member' },
  { value: 'mentor',      label: 'Mentor' },
  { value: 'past_leader', label: 'Past Leader' },
];

const SECTION_COLORS: Record<string, string> = {
  gdg_lead:    'bg-blue-100 text-blue-700',
  co_lead:     'bg-indigo-100 text-indigo-700',
  member:      'bg-green-100 text-green-700',
  mentor:      'bg-yellow-100 text-yellow-700',
  past_leader: 'bg-gray-100 text-gray-600',
};

const emptyForm = {
  full_name:     '',
  role_title:    '',
  bio:           '',
  avatar_url:    '',
  linkedin_url:  '',
  github_url:    '',
  display_order: 0,
  is_active:     true,
  section:       'member',
  team_name:     '',
  tenure_year:   '',
};

export default function TeamCMSPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [members, setMembers]   = useState<any[]>([]);
  const [editing, setEditing]   = useState<string | null>(null);
  const [adding, setAdding]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [form, setForm]         = useState(emptyForm);
  const [filterSection, setFilterSection] = useState('all');

  // Teams
  const [teams, setTeams]       = useState<any[]>([]);
  const [tab, setTab]           = useState<'members' | 'teams'>('members');
  const [newTeam, setNewTeam]   = useState('');
  const [teamSaving, setTeamSaving] = useState(false);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState('');

  useEffect(() => { fetchMembers(); fetchTeams(); }, []);

  function fetchMembers() {
    fetch(`${API_URL}/api/cms/team`)
      .then((r) => r.json())
      .then((res) => setMembers(res.data ?? []))
      .catch(() => {});
  }

  function fetchTeams() {
    fetch(`${API_URL}/api/cms/teams`)
      .then((r) => r.json())
      .then((res) => setTeams(res.data ?? []))
      .catch(() => {});
  }

  async function handleCreateTeam() {
    if (!newTeam.trim()) { setError('Team name is required.'); return; }
    setTeamSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/cms/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newTeam.trim(), display_order: teams.length }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to create team.'); return; }
      setSuccess('Team created!');
      setTimeout(() => setSuccess(''), 3000);
      setNewTeam('');
      fetchTeams();
    } catch {
      setError('Something went wrong.');
    } finally {
      setTeamSaving(false);
    }
  }

  async function handleMoveTeam(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= teams.length) return;
    const reordered = [...teams];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    // Persist: rewrite every team's display_order to its new position (robust even if old values were equal)
    setTeams(reordered.map((t, i) => ({ ...t, display_order: i }))); // optimistic
    try {
      await Promise.all(
        reordered.map((t, i) =>
          fetch(`${API_URL}/api/cms/teams/${t.team_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ display_order: i }),
          })
        )
      );
      fetchTeams();
    } catch {
      setError('Failed to reorder teams.');
      fetchTeams();
    }
  }

  function startEditTeam(t: any) {
    setEditingTeam(t.team_id);
    setEditTeamName(t.name);
    setError('');
  }

  function cancelEditTeam() {
    setEditingTeam(null);
    setEditTeamName('');
  }

  async function handleRenameTeam(id: string) {
    const name = editTeamName.trim();
    if (!name) { setError('Team name is required.'); return; }
    setTeamSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/cms/teams/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to rename team.'); return; }
      setSuccess('Team renamed!');
      setTimeout(() => setSuccess(''), 3000);
      cancelEditTeam();
      // Members are re-tagged server-side, so refresh both lists.
      fetchTeams();
      fetchMembers();
    } catch {
      setError('Something went wrong.');
    } finally {
      setTeamSaving(false);
    }
  }

  async function handleDeleteTeam(id: string, name: string) {
    if (!confirm(`Delete team "${name}"? Members keep their tag but it won't be selectable anymore.`)) return;
    try {
      await fetch(`${API_URL}/api/cms/teams/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchTeams();
    } catch {
      setError('Failed to delete team.');
    }
  }

  function startEdit(member: any) {
    setEditing(member.member_id);
    setAdding(false);
    setError('');
    setForm({
      full_name:     member.full_name ?? '',
      role_title:    member.role_title ?? '',
      bio:           member.bio ?? '',
      avatar_url:    member.avatar_url ?? '',
      linkedin_url:  member.linkedin_url ?? '',
      github_url:    member.github_url ?? '',
      display_order: member.display_order ?? 0,
      is_active:     member.is_active ?? true,
      section:       member.section ?? 'member',
      team_name:     member.team_name ?? '',
      tenure_year:   member.tenure_year ?? '',
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
    if (!form.full_name.trim() || !form.role_title.trim()) {
      setError('Full name and role title are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        full_name:     form.full_name.trim(),
        role_title:    form.role_title.trim(),
        bio:           form.bio.trim() || null,
        avatar_url:    form.avatar_url.trim() || null,
        linkedin_url:  form.linkedin_url.trim() || null,
        github_url:    form.github_url.trim() || null,
        display_order: Number(form.display_order),
        is_active:     form.is_active,
        section:       form.section,
        team_name:     form.team_name.trim() || null,
        tenure_year:   form.tenure_year.trim() || null,
      };

      const url    = adding ? `${API_URL}/api/cms/team` : `${API_URL}/api/cms/team/${editing}`;
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

      setSuccess(adding ? 'Member added!' : 'Member updated!');
      setTimeout(() => setSuccess(''), 3000);
      cancelForm();
      fetchMembers();
    } catch {
      setError('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await fetch(`${API_URL}/api/cms/team/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchMembers();
    } catch {
      setError('Failed to delete.');
    }
  }

  const filteredMembers = filterSection === 'all'
    ? members
    : members.filter((m) => m.section === filterSection);

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
            <h1 className="text-2xl font-bold text-gray-900">Team Editor</h1>
            <p className="text-sm text-gray-500 mt-0.5">{members.length} team members</p>
          </div>
          {tab === 'members' && (
            <button
              onClick={startAdd}
              className="ml-auto px-4 py-2 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all"
            >
              + Add Member
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          {([['members', 'Members'], ['teams', 'Teams']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); cancelForm(); setError(''); }}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all ${
                tab === key ? 'border-[#4285F4] text-[#4285F4]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}{key === 'teams' ? ` (${teams.length})` : ` (${members.length})`}
            </button>
          ))}
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

        {tab === 'members' && (
        <>
        {/* Add / Edit Form */}
        {(adding || editing) && (
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6 mb-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-5">
              {adding ? 'Add New Member' : 'Edit Member'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.full_name} onChange={(e) => handleField('full_name', e.target.value)} className={inputClass} placeholder="Ahmad Ali" />
              </div>

              {/* Role Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role Title <span className="text-red-500">*</span></label>
                <input type="text" value={form.role_title} onChange={(e) => handleField('role_title', e.target.value)} className={inputClass} placeholder="GDG Lead" />
              </div>

              {/* Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Section <span className="text-red-500">*</span></label>
                <select value={form.section} onChange={(e) => handleField('section', e.target.value)} className={inputClass}>
                  {SECTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Team — only for co_lead and member; choose from existing teams */}
              {(form.section === 'co_lead' || form.section === 'member') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Team</label>
                  {teams.length === 0 ? (
                    <div className="text-sm text-gray-500 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 bg-gray-50">
                      No teams yet — create one in the{' '}
                      <button type="button" onClick={() => setTab('teams')} className="text-blue-600 font-medium hover:underline">
                        Teams
                      </button>{' '}
                      tab first.
                    </div>
                  ) : (
                    <select
                      value={form.team_name}
                      onChange={(e) => handleField('team_name', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">— Select a team —</option>
                      {teams.map((t) => (
                        <option key={t.team_id} value={t.name}>{t.name}</option>
                      ))}
                      {/* Keep a legacy/unlisted team name selectable so editing doesn't lose it */}
                      {form.team_name && !teams.some((t) => t.name === form.team_name) && (
                        <option value={form.team_name}>{form.team_name} (unlisted)</option>
                      )}
                    </select>
                  )}
                </div>
              )}

              {/* Tenure Year — only for past_leader */}
              {form.section === 'past_leader' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tenure Year</label>
                  <input
                    type="text"
                    value={form.tenure_year}
                    onChange={(e) => handleField('tenure_year', e.target.value)}
                    className={inputClass}
                    placeholder="e.g. 2023"
                  />
                </div>
              )}

              {/* Avatar URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Avatar URL</label>
                <input type="text" value={form.avatar_url} onChange={(e) => handleField('avatar_url', e.target.value)} className={inputClass} placeholder="https://..." />
              </div>

              {/* LinkedIn */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">LinkedIn URL</label>
                <input type="text" value={form.linkedin_url} onChange={(e) => handleField('linkedin_url', e.target.value)} className={inputClass} placeholder="https://linkedin.com/in/..." />
              </div>

              {/* GitHub */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">GitHub URL</label>
                <input type="text" value={form.github_url} onChange={(e) => handleField('github_url', e.target.value)} className={inputClass} placeholder="https://github.com/..." />
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Order</label>
                <input type="number" value={form.display_order} onChange={(e) => handleField('display_order', Number(e.target.value))} className={inputClass} min={0} />
              </div>

            </div>

            {/* Bio */}
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

            {/* Is Active toggle */}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleField('is_active', !form.is_active)}
                className={`relative w-10 h-5 rounded-full transition-all ${form.is_active ? 'bg-green-400' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.is_active ? 'left-5' : 'left-0.5'}`} />
              </button>
              <span className="text-sm text-gray-600">{form.is_active ? 'Active' : 'Inactive'}</span>
            </div>

            {/* Avatar preview */}
            {form.avatar_url && (
              <div className="mt-4 flex items-center gap-3">
                <img
                  src={form.avatar_url}
                  alt="Avatar preview"
                  className="w-12 h-12 rounded-full object-cover border border-gray-200"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <p className="text-xs text-gray-400">Avatar preview</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all disabled:opacity-60"
              >
                {saving ? 'Saving...' : adding ? 'Add Member' : 'Save Changes'}
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

        {/* Filter by section */}
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setFilterSection('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              filterSection === 'all' ? 'bg-[#4285F4] text-white border-[#4285F4]' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            All ({members.length})
          </button>
          {SECTION_OPTIONS.map((opt) => {
            const count = members.filter((m) => m.section === opt.value).length;
            if (count === 0) return null;
            return (
              <button
                key={opt.value}
                onClick={() => setFilterSection(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  filterSection === opt.value ? 'bg-[#4285F4] text-white border-[#4285F4]' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {opt.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Members List */}
        <div className="space-y-3">
          {filteredMembers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">
              No members in this section yet.
            </div>
          ) : (
            filteredMembers.map((member) => (
              <div key={member.member_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:border-blue-100 transition-all">

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {member.avatar_url
                    ? <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" />
                    : <span className="text-sm font-bold text-white">{member.full_name?.charAt(0)}</span>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800">{member.full_name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SECTION_COLORS[member.section] ?? 'bg-gray-100 text-gray-600'}`}>
                      {SECTION_OPTIONS.find((o) => o.value === member.section)?.label ?? member.section}
                    </span>
                    {member.team_name && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                        {member.team_name}
                      </span>
                    )}
                    {member.tenure_year && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
                        {member.tenure_year}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{member.role_title}</p>
                </div>

                {/* Active badge */}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${
                  member.is_active ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'
                }`}>
                  {member.is_active ? 'Active' : 'Inactive'}
                </span>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => startEdit(member)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(member.member_id, member.full_name)}
                    className="px-3 py-1.5 rounded-lg border border-red-100 text-xs font-medium text-red-500 hover:bg-red-50 transition-all"
                  >
                    Delete
                  </button>
                </div>

              </div>
            ))
          )}
        </div>
        </>
        )}

        {/* ── Teams tab ── */}
        {tab === 'teams' && (
          <div>
            {/* Create a team */}
            <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6 mb-6">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Create a Team</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTeam(); }}
                  className={`${inputClass} flex-1`}
                  placeholder="e.g. Technical Team"
                />
                <button
                  onClick={handleCreateTeam}
                  disabled={teamSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all disabled:opacity-60 whitespace-nowrap"
                >
                  {teamSaving ? 'Creating...' : '+ Create Team'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Teams appear as options when adding a Co-Lead or Team Member.</p>
            </div>

            {/* Teams list */}
            <div className="space-y-3">
              {teams.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">
                  No teams yet. Create your first team above.
                </div>
              ) : (
                teams.map((t, i) => {
                  const count = members.filter((m) => m.team_name === t.name).length;
                  return (
                    <div key={t.team_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:border-blue-100 transition-all">
                      {/* Reorder controls */}
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => handleMoveTeam(i, -1)}
                          disabled={i === 0}
                          title="Move up"
                          className="w-6 h-5 rounded-md border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button
                          onClick={() => handleMoveTeam(i, 1)}
                          disabled={i === teams.length - 1}
                          title="Move down"
                          className="w-6 h-5 rounded-md border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                      </div>
                      <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {t.name.charAt(0).toUpperCase()}
                      </span>
                      {editingTeam === t.team_id ? (
                        <>
                          <input
                            type="text"
                            value={editTeamName}
                            autoFocus
                            onChange={(e) => setEditTeamName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameTeam(t.team_id);
                              if (e.key === 'Escape') cancelEditTeam();
                            }}
                            className={`${inputClass} flex-1`}
                          />
                          <button
                            onClick={() => handleRenameTeam(t.team_id)}
                            disabled={teamSaving}
                            className="px-3 py-1.5 rounded-lg bg-[#4285F4] text-white text-xs font-semibold hover:bg-blue-600 transition-all disabled:opacity-60 flex-shrink-0"
                          >
                            {teamSaving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={cancelEditTeam}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-blue-300 transition-all flex-shrink-0"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{t.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{count} member{count !== 1 ? 's' : ''}</p>
                          </div>
                          <button
                            onClick={() => startEditTeam(t)}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all flex-shrink-0"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(t.team_id, t.name)}
                            className="px-3 py-1.5 rounded-lg border border-red-100 text-xs font-medium text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}