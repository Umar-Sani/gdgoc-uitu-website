'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';

// ─── Types ────────────────────────────────────────────────────────────────────

type User = {
  user_id: string;
  email: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  role_name: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login: string | null;
};

type Role = {
  role_id: number;
  role_name: string;
  description: string;
};

type ModalAction =
  | { type: 'disable';     user: User }
  | { type: 'enable';      user: User }
  | { type: 'delete';      user: User }
  | { type: 'change_role'; user: User; newRole: string }
  | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleColor(role: string): string {
  switch (role) {
    case 'super_admin': return 'bg-red-100 text-red-700';
    case 'admin':       return 'bg-orange-100 text-orange-700';
    case 'editor':      return 'bg-blue-100 text-blue-700';
    case 'member':      return 'bg-green-100 text-green-700';
    default:            return 'bg-gray-100 text-gray-700';
  }
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────

function ConfirmModal({
  action,
  onConfirm,
  onCancel,
  loading,
}: {
  action: ModalAction;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  if (!action) return null;

  const isDelete     = action.type === 'delete';
  const isDisable    = action.type === 'disable';
  const isRoleChange = action.type === 'change_role';

  const title = isDelete     ? 'Delete Account'
              : isDisable    ? 'Disable Account'
              : isRoleChange ? 'Change Role'
              :                'Enable Account';

  const body = isDelete
    ? `This will permanently delete ${action.user.full_name}'s account and revoke all access. This cannot be undone.`
    : isDisable
    ? `${action.user.full_name} will be immediately signed out and unable to log back in until re-enabled.`
    : isRoleChange
    ? `${action.user.full_name}'s role will change from ${action.user.role_name.replace('_', ' ')} to ${(action as any).newRole.replace('_', ' ')}. Their permissions will update immediately.`
    : `${action.user.full_name}'s account will be re-enabled and they will be able to log in again.`;

  const confirmLabel = isDelete     ? 'Delete permanently'
                     : isDisable    ? 'Disable account'
                     : isRoleChange ? 'Change role'
                     :               'Enable account';

  const accentColor  = isDelete     ? 'bg-red-500'
                     : isDisable    ? 'bg-yellow-500'
                     : isRoleChange ? 'bg-blue-500'
                     :               'bg-green-500';

  const confirmClass = isDelete     ? 'bg-red-600 hover:bg-red-700 text-white'
                     : isDisable    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                     : isRoleChange ? 'bg-blue-500 hover:bg-blue-600 text-white'
                     :               'bg-green-500 hover:bg-green-600 text-white';

  const iconBg      = isDelete     ? 'bg-red-50'
                    : isDisable    ? 'bg-yellow-50'
                    : isRoleChange ? 'bg-blue-50'
                    :               'bg-green-50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Top accent */}
        <div className={`h-1 w-full ${accentColor}`} />

        <div className="p-6">
          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${iconBg}`}>
            {isDelete ? (
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ) : isDisable ? (
              <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : isRoleChange ? (
              <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          <h3 className="text-base font-bold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed mb-1">{body}</p>
          <p className="text-xs font-medium text-gray-400 mb-6">
            {action.user.email}
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${confirmClass}`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Working...
                </span>
              ) : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { isAdmin } = useRequireAdmin();
  const { token, user: adminUser } = useAuth();
  const isSuperAdmin = adminUser?.role_name === 'super_admin';

  const [users, setUsers]     = useState<User[]>([]);
  const [roles, setRoles]     = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);

  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [modal, setModal]         = useState<ModalAction>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [feedback, setFeedback]   = useState<{ id: string; message: string; type: 'success' | 'error' } | null>(null);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const LIMIT   = 20;
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-800">Access Denied</p>
          <p className="text-sm text-gray-500 mt-1">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // ─── Fetch roles ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/api/admin/roles`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => { if (res.data) setRoles(res.data); })
      .catch(console.error);
  }, []);

  // ─── Fetch users ─────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search)               params.append('search', search);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res  = await fetch(`${API_URL}/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) { setUsers(json.data); setTotal(json.total); }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => { fetchUsers(); },               [fetchUsers]);
  useEffect(() => { setPage(1); },                 [search, roleFilter, statusFilter]);
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ─── Confirm modal action ─────────────────────────────────────────────────────
  async function handleConfirm() {
    if (!modal) return;
    setModalLoading(true);

    try {
      if (modal.type === 'delete') {
        const res  = await fetch(`${API_URL}/api/admin/users/${modal.user.user_id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setFeedback({ id: modal.user.user_id, message: res.ok ? 'User permanently deleted' : (json.error || 'Failed'), type: res.ok ? 'success' : 'error' });
        if (res.ok) fetchUsers();

      } else if (modal.type === 'change_role') {
        const res  = await fetch(`${API_URL}/api/admin/users/${modal.user.user_id}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ role_name: modal.newRole }),
        });
        const json = await res.json();
        setFeedback({ id: modal.user.user_id, message: res.ok ? 'Role updated' : (json.error || 'Failed'), type: res.ok ? 'success' : 'error' });
        if (res.ok) fetchUsers();

      } else {
        const newStatus = modal.type === 'enable';
        const res  = await fetch(`${API_URL}/api/admin/users/${modal.user.user_id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ is_active: newStatus }),
        });
        const json = await res.json();
        setFeedback({ id: modal.user.user_id, message: res.ok ? (newStatus ? 'Account enabled' : 'Account disabled') : (json.error || 'Failed'), type: res.ok ? 'success' : 'error' });
        if (res.ok) fetchUsers();
      }
    } catch {
      if (modal) setFeedback({ id: modal.user.user_id, message: 'Something went wrong', type: 'error' });
    } finally {
      setModalLoading(false);
      setModal(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      <ConfirmModal
        action={modal}
        onConfirm={handleConfirm}
        onCancel={() => setModal(null)}
        loading={modalLoading}
      />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* Header */}
          <div className="mb-8">
            <div className="h-1 w-16 flex mb-4 rounded-full overflow-hidden">
              <div className="flex-1 bg-[#4285F4]" />
              <div className="flex-1 bg-[#EA4335]" />
              <div className="flex-1 bg-[#FBBC05]" />
              <div className="flex-1 bg-[#34A853]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">User Management</h1>
            <p className="text-sm text-gray-500 mt-1">{total} total users</p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email or username..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white"
            >
              <option value="all">All Roles</option>
              {roles.map((role) => (
                <option key={role.role_id} value={role.role_name}>{role.role_name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-gray-400 text-sm">No users found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {users.map((user) => {
                  const isSuperAdminRow = user.role_name === 'super_admin';

                  return (
                    <div
                      key={user.user_id}
                      className={`px-6 py-4 flex items-center gap-4 transition-colors ${
                        user.is_active ? 'hover:bg-gray-50' : 'bg-red-50/40 hover:bg-red-50/60'
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                        user.is_active
                          ? 'bg-gradient-to-br from-blue-400 to-indigo-500'
                          : 'bg-gradient-to-br from-gray-300 to-gray-400'
                      }`}>
                        {user.avatar_url
                          ? <img src={user.avatar_url} alt={user.full_name} className="w-full h-full rounded-full object-cover" />
                          : getInitials(user.full_name || 'U')
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">{user.full_name}</p>
                          {!user.is_active && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 border border-red-200">
                              Inactive
                            </span>
                          )}
                          {isSuperAdminRow && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                              Protected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        {feedback?.id === user.user_id && (
                          <p className={`text-xs mt-0.5 font-medium ${feedback.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                            {feedback.message}
                          </p>
                        )}
                      </div>

                      {/* Role selector — disabled for super_admin rows */}
                      <select
                        value={user.role_name}
                        onChange={(e) => {
                          if (e.target.value !== user.role_name)
                            setModal({ type: 'change_role', user, newRole: e.target.value });
                        }}
                        disabled={updatingUser === user.user_id || isSuperAdminRow}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium outline-none transition-all ${roleColor(user.role_name)} border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {roles.map((role) => (
                          <option key={role.role_id} value={role.role_name}>{role.role_name}</option>
                        ))}
                      </select>

                      {/* Enable / disable toggle — hidden for super_admin */}
                      {isSuperAdminRow ? (
                        <div className="w-10 h-5 flex-shrink-0" />
                      ) : (
                        <button
                          onClick={() => setModal({ type: user.is_active ? 'disable' : 'enable', user })}
                          disabled={updatingUser === user.user_id}
                          title={user.is_active ? 'Disable account' : 'Enable account'}
                          className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 disabled:opacity-50 ${
                            user.is_active ? 'bg-green-400' : 'bg-gray-300'
                          }`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                            user.is_active ? 'left-5' : 'left-0.5'
                          }`} />
                        </button>
                      )}

                      {/* Delete — super_admin only, hidden for super_admin rows */}
                      {isSuperAdmin && (
                        isSuperAdminRow ? (
                          <div className="w-7 h-7 flex-shrink-0" />
                        ) : (
                          <button
                            onClick={() => setModal({ type: 'delete', user })}
                            disabled={updatingUser === user.user_id}
                            title="Delete user"
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 transition-all flex-shrink-0 disabled:opacity-50"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-blue-300 disabled:opacity-40 transition-all"
              >
                ← Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${
                    page === p ? 'bg-[#4285F4] text-white' : 'border border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-blue-300 disabled:opacity-40 transition-all"
              >
                Next →
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
