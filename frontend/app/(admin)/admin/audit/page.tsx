'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';

type ActivityLog = {
  log_id: string;
  table_name: string;
  record_id: string;
  operation: string;
  changed_at: string;
  ip_address: string | null;
  changed_by_name: string;
  changed_by_email: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
};

function operationColor(op: string): string {
  switch (op) {
    case 'INSERT': return 'bg-green-100 text-green-700';
    case 'UPDATE': return 'bg-blue-100 text-blue-700';
    case 'DELETE': return 'bg-red-100 text-red-700';
    default:       return 'bg-gray-100 text-gray-700';
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminAuditPage() {
  const { isSuperAdmin } = useRequireAdmin({ superAdminOnly: true });
  const { token } = useAuth();

  const [logs, setLogs]         = useState<ActivityLog[]>([]);
  const [loading, setLoading]   = useState(true);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [tableFilter, setTableFilter]     = useState('');
  const [operationFilter, setOperationFilter] = useState('all');

  const LIMIT = 50;
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-800">Access Denied</p>
          <p className="text-sm text-gray-500 mt-1">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (tableFilter) params.append('table_name', tableFilter);
      if (operationFilter !== 'all') params.append('operation', operationFilter);

      const res = await fetch(`${API_URL}/api/admin/audit?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) { setLogs(json.data); setTotal(json.total); }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [tableFilter, operationFilter, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [tableFilter, operationFilter]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        <div className="mb-8">
          <div className="h-1 w-16 flex mb-4 rounded-full overflow-hidden">
            <div className="flex-1 bg-[#4285F4]" />
            <div className="flex-1 bg-[#EA4335]" />
            <div className="flex-1 bg-[#FBBC05]" />
            <div className="flex-1 bg-[#34A853]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total records</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Filter by table (e.g. forum.threads)"
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="flex-1 max-w-sm px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
          />
          <select
            value={operationFilter}
            onChange={(e) => setOperationFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white"
          >
            <option value="all">All Operations</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        {/* Logs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="px-6 py-4 animate-pulse flex gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-gray-400 text-sm">No audit logs found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {logs.map((log) => (
                <div key={log.log_id}>
                  <button
                    onClick={() => setExpanded(expanded === log.log_id ? null : log.log_id)}
                    className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${operationColor(log.operation)}`}>
                      {log.operation}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{log.table_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        by {log.changed_by_name}
                        {log.changed_by_email ? ` · ${log.changed_by_email}` : ''}
                        {log.ip_address ? ` · ${log.ip_address}` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(log.changed_at)}</span>
                    <svg
                      className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${expanded === log.log_id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded diff view */}
                  {expanded === log.log_id && (
                    <div className="px-6 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {log.old_values && (
                        <div>
                          <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-2">Before</p>
                          <pre className="text-xs bg-red-50 border border-red-100 rounded-xl p-3 overflow-auto max-h-48 text-gray-700 whitespace-pre-wrap">
                            {JSON.stringify(log.old_values, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.new_values && (
                        <div>
                          <p className="text-xs font-bold text-green-500 uppercase tracking-wide mb-2">After</p>
                          <pre className="text-xs bg-green-50 border border-green-100 rounded-xl p-3 overflow-auto max-h-48 text-gray-700 whitespace-pre-wrap">
                            {JSON.stringify(log.new_values, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-blue-300 disabled:opacity-40 transition-all">
              ← Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${page === p ? 'bg-[#4285F4] text-white' : 'border border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-blue-300 disabled:opacity-40 transition-all">
              Next →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}