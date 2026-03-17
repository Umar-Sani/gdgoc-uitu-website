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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { isAdmin } = useRequireAdmin();
  const { token } = useAuth();

  const [users, setUsers]       = useState<User[]>([]);
  const [roles, setRoles]       = useState<Role[]>([]);
  const [loading, setLoading]   = useState(true);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);

  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter]   = useState('all');

  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [feedback, setFeedback]         = useState<{ id: string; message: string; type: 'success' | 'error' } | null>(null);

  const LIMIT = 20;
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

  // ─── Fetch roles ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/api/admin/roles`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => { if (res.data) setRoles(res.data); })
      .catch(console.error);
  }, []);

  // ─── Fetch users ────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (search) params.append('search', search);
      if (roleFilter !== 'all') params.append('role', roleFilter);

      const res = await fetch(`${API_URL}/api/admin/users?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) {
        setUsers(json.data);
        setTotal(json.total);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [search, roleFilter]);

  // ─── Search debounce ─────────────────────────────────────────────────────────
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 500);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // ─── Change role ─────────────────────────────────────────────────────────────
  async function handleRoleChange(userId: string, roleName: string) {
    setUpdatingUser(userId);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role_name: roleName }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({ id: userId, message: json.error || 'Failed to update role', type: 'error' });
        return;
      }
      setFeedback({ id: userId, message: 'Role updated', type: 'success' });
      fetchUsers();
    } catch {
      setFeedback({ id: userId, message: 'Something went wrong', type: 'error' });
    } finally {
      setUpdatingUser(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  }

  // ─── Toggle active status ─────────────────────────────────────────────────────
  async function handleStatusToggle(userId: string, isActive: boolean) {
    setUpdatingUser(userId);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !isActive }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({ id: userId, message: json.error || 'Failed to update status', type: 'error' });
        return;
      }
      setFeedback({ id: userId, message: isActive ? 'User deactivated' : 'User activated', type: 'success' });
      fetchUsers();
    } catch {
      setFeedback({ id: userId, message: 'Something went wrong', type: 'error' });
    } finally {
      setUpdatingUser(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
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

        {/* ── Filters ── */}
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
              <option key={role.role_id} value={role.role_name}>
                {role.role_name}
              </option>
            ))}
          </select>
        </div>

        {/* ── Users Table ── */}
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
              {users.map((user) => (
                <div key={user.user_id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
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
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                          Inactive
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

                  {/* Role selector */}
                  <select
                    value={user.role_name}
                    onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                    disabled={updatingUser === user.user_id}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium outline-none transition-all ${roleColor(user.role_name)} border-transparent disabled:opacity-50`}
                  >
                    {roles.map((role) => (
                      <option key={role.role_id} value={role.role_name}>
                        {role.role_name}
                      </option>
                    ))}
                  </select>

                  {/* Active toggle */}
                  <button
                    onClick={() => handleStatusToggle(user.user_id, user.is_active)}
                    disabled={updatingUser === user.user_id}
                    className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 disabled:opacity-50 ${
                      user.is_active ? 'bg-green-400' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                      user.is_active ? 'left-5' : 'left-0.5'
                    }`} />
                  </button>

                </div>
              ))}
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
  );
}