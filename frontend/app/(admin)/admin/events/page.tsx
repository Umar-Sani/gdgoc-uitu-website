'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

type Event = {
  event_id: string;
  title: string;
  event_type: string;
  category_name: string;
  status: string;
  start_datetime: string;
  max_seats: number;
  seats_registered: number;
  is_free: boolean;
  ticket_price: number | null;
};

function statusColor(status: string): string {
  switch (status) {
    case 'published':  return 'bg-green-100 text-green-700';
    case 'draft':      return 'bg-gray-100 text-gray-600';
    case 'cancelled':  return 'bg-red-100 text-red-600';
    case 'completed':  return 'bg-blue-100 text-blue-600';
    case 'ongoing':    return 'bg-yellow-100 text-yellow-700';
    default:           return 'bg-gray-100 text-gray-600';
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminEventsPage() {
  const { token } = useAuth();

  const [events, setEvents]   = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);

  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [feedback, setFeedback]       = useState('');

  const LIMIT = 20;
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`${API_URL}/api/admin/events?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) { setEvents(json.data); setTotal(json.total); }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 500);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  async function handleDelete(eventId: string, title: string) {
    if (!confirm(`Cancel event "${title}"? This cannot be undone.`)) return;

    setDeletingId(eventId);
    try {
      const res = await fetch(`${API_URL}/api/admin/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) { setFeedback(json.error || 'Failed to cancel event'); return; }
      setFeedback('Event cancelled successfully');
      fetchEvents();
    } catch {
      setFeedback('Something went wrong');
    } finally {
      setDeletingId(null);
      setTimeout(() => setFeedback(''), 3000);
    }
  }

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Event Management</h1>
              <p className="text-sm text-gray-500 mt-1">{total} total events</p>
            </div>
            <Link
              href="/admin/events/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white text-sm font-semibold transition-all shadow-md"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Event
            </Link>
          </div>
        </div>

        {feedback && (
          <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700">
            {feedback}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search events..."
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
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Events Table */}
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
          ) : events.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-gray-400 text-sm">No events found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {events.map((event) => (
                <div key={event.event_id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">{event.title}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor(event.status)}`}>
                        {event.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="capitalize">{event.event_type}</span>
                      <span>·</span>
                      <span>{formatDate(event.start_datetime)}</span>
                      <span>·</span>
                      <span>{event.seats_registered}/{event.max_seats} seats</span>
                      <span>·</span>
                      <span>{event.is_free ? 'Free' : `PKR ${event.ticket_price?.toLocaleString()}`}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/admin/events/${event.event_id}/edit`}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(event.event_id, event.title)}
                      disabled={deletingId === event.event_id || event.status === 'cancelled'}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:border-red-300 hover:text-red-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {deletingId === event.event_id ? '...' : 'Cancel'}
                    </button>
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