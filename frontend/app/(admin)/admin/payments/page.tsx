'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';

type Transaction = {
  transaction_id: string;
  invoice_number: string;
  status: string;
  amount: number;
  currency: string;
  gateway: string;
  initiated_at: string;
  completed_at: string | null;
  payer_name: string;
  payer_email: string;
  event_title: string;
  event_date: string;
};

function statusColor(status: string): string {
  switch (status) {
    case 'success':  return 'bg-green-100 text-green-700';
    case 'pending':  return 'bg-yellow-100 text-yellow-700';
    case 'failed':   return 'bg-red-100 text-red-600';
    case 'refunded': return 'bg-blue-100 text-blue-600';
    default:         return 'bg-gray-100 text-gray-600';
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function AdminPaymentsPage() {
  const { isAdmin } = useRequireAdmin();
  const { token } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);

  const [search, setSearch]             = useState('');
  const [searchInput, setSearchInput]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`${API_URL}/api/admin/payments?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) { setTransactions(json.data); setTotal(json.total); }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 500);
    return () => clearTimeout(timeout);
  }, [searchInput]);

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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payment History</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total transactions</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email or invoice..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-6 py-4 animate-pulse flex gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-gray-400 text-sm">No transactions found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {transactions.map((tx) => (
                <div key={tx.transaction_id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{tx.payer_name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor(tx.status)}`}>
                        {tx.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                      <span>{tx.payer_email}</span>
                      <span>·</span>
                      <span className="truncate max-w-xs">{tx.event_title}</span>
                      <span>·</span>
                      <span>{formatDate(tx.initiated_at)}</span>
                      <span>·</span>
                      <span className="font-mono text-gray-500">{tx.invoice_number}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">
                      {tx.currency} {Number(tx.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{tx.gateway}</p>
                  </div>
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