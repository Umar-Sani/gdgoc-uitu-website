'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-PK', {
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Section ──────────────────────────────────────────────────────────────────

type SectionConfig = {
  key:   string;
  label: string;
  accent: string;
  badge:  string;
  empty:  string;
};

const SECTIONS: SectionConfig[] = [
  {
    key:    'upcoming',
    label:  'Upcoming',
    accent: 'bg-[#4285F4]',
    badge:  'bg-blue-50 text-blue-700 border-blue-100',
    empty:  'No upcoming events',
  },
  {
    key:    'draft',
    label:  'Drafts',
    accent: 'bg-gray-400',
    badge:  'bg-gray-100 text-gray-600 border-gray-200',
    empty:  'No drafts',
  },
  {
    key:    'past',
    label:  'Past Events',
    accent: 'bg-[#34A853]',
    badge:  'bg-green-50 text-green-700 border-green-100',
    empty:  'No past events',
  },
  {
    key:    'cancelled',
    label:  'Cancelled',
    accent: 'bg-[#EA4335]',
    badge:  'bg-red-50 text-red-600 border-red-100',
    empty:  'No cancelled events',
  },
];

function classifyEvent(event: Event): 'upcoming' | 'past' | 'draft' | 'cancelled' {
  if (event.status === 'draft')     return 'draft';
  if (event.status === 'cancelled') return 'cancelled';
  // published, ongoing, completed
  const isPast = new Date(event.start_datetime) <= new Date() || event.status === 'completed';
  return isPast ? 'past' : 'upcoming';
}

function sortEvents(events: Event[], direction: 'asc' | 'desc'): Event[] {
  return [...events].sort((a, b) => {
    const diff = new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
    return direction === 'asc' ? diff : -diff;
  });
}

// ─── Event Row ────────────────────────────────────────────────────────────────

function EventRow({
  event,
  sectionKey,
  deletingId,
  onDelete,
}: {
  event: Event;
  sectionKey: string;
  deletingId: string | null;
  onDelete: (id: string, title: string) => void;
}) {
  return (
    <div className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{event.title}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
          <span className="capitalize">{event.event_type}</span>
          <span>·</span>
          <span>{formatDate(event.start_datetime)}</span>
          <span>{formatTime(event.start_datetime)}</span>
          <span>·</span>
          <span>{event.seats_registered}/{event.max_seats} seats</span>
          <span>·</span>
          <span>{event.is_free ? 'Free' : `PKR ${event.ticket_price?.toLocaleString()}`}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href={`/admin/events/${event.event_id}/edit`}
          className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all"
        >
          Edit
        </Link>
        {sectionKey !== 'cancelled' && (
          <button
            onClick={() => onDelete(event.event_id, event.title)}
            disabled={deletingId === event.event_id}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:border-red-300 hover:text-red-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deletingId === event.event_id ? '...' : 'Cancel'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Section Block ────────────────────────────────────────────────────────────

function EventSection({
  config,
  events,
  deletingId,
  onDelete,
}: {
  config: SectionConfig;
  events: Event[];
  deletingId: string | null;
  onDelete: (id: string, title: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${config.accent}`} />
        <span className="text-sm font-bold text-gray-900 flex-1">{config.label}</span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badge}`}>
          {events.length}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '-rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <>
          {events.length === 0 ? (
            <div className="px-5 py-6 text-center border-t border-gray-50">
              <p className="text-xs text-gray-400">{config.empty}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 border-t border-gray-50">
              {events.map((event) => (
                <EventRow
                  key={event.event_id}
                  event={event}
                  sectionKey={config.key}
                  deletingId={deletingId}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminEventsPage() {
  const { token } = useAuth();

  const [events, setEvents]     = useState<Event[]>([]);
  const [loading, setLoading]   = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]     = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '500' });
      if (search) params.append('search', search);

      const res  = await fetch(`${API_URL}/api/admin/events?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) setEvents(json.data);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ─── Group + sort ─────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const buckets: Record<string, Event[]> = {
      upcoming:  [],
      past:      [],
      draft:     [],
      cancelled: [],
    };
    for (const event of events) {
      buckets[classifyEvent(event)].push(event);
    }
    return {
      upcoming:  sortEvents(buckets.upcoming,  'asc'),   // soonest first
      past:      sortEvents(buckets.past,      'desc'),  // most recent first
      draft:     sortEvents(buckets.draft,     'desc'),
      cancelled: sortEvents(buckets.cancelled, 'desc'),
    };
  }, [events]);

  async function handleDelete(eventId: string, title: string) {
    if (!confirm(`Cancel event "${title}"? This cannot be undone.`)) return;
    setDeletingId(eventId);
    try {
      const res  = await fetch(`${API_URL}/api/admin/events/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) { setFeedback(json.error || 'Failed to cancel event'); return; }
      setFeedback('Event cancelled');
      fetchEvents();
    } catch {
      setFeedback('Something went wrong');
    } finally {
      setDeletingId(null);
      setTimeout(() => setFeedback(''), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="h-1 w-16 flex mb-4 rounded-full overflow-hidden">
            <div className="flex-1 bg-[#4285F4]" />
            <div className="flex-1 bg-[#EA4335]" />
            <div className="flex-1 bg-[#FBBC05]" />
            <div className="flex-1 bg-[#34A853]" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Event Management</h1>
              <p className="text-sm text-gray-500 mt-1">{events.length} total events</p>
            </div>
            <Link
              href="/admin/events/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white text-sm font-semibold transition-all shadow-md flex-shrink-0"
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

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-sm">
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
        </div>

        {/* Sections */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-200" />
                  <div className="h-4 bg-gray-200 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {SECTIONS.map((section) => (
              <EventSection
                key={section.key}
                config={section}
                events={grouped[section.key as keyof typeof grouped]}
                deletingId={deletingId}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
