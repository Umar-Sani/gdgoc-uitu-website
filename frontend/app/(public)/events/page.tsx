'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Event } from '@shared/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
  category_id: number;
  name: string;
};

type EventsResponse = {
  data: Event[];
  total: number;
  page: number;
  limit: number;
  error: null;
};

type TabType = 'upcoming' | 'past';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getSeatsColor(fillPercentage: number): string {
  if (fillPercentage >= 90) return 'bg-red-500';
  if (fillPercentage >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getSeatsLabel(available: number, max: number): string {
  if (available === 0) return 'Fully Booked';
  if (available <= 5) return `Only ${available} left!`;
  return `${available} / ${max} seats available`;
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: Event }) {
  const fillPct = event.fill_percentage ?? 0;
  const isFullyBooked = event.seats_available === 0;

  return (
    <Link href={`/events/${event.event_id}`}>
      <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-blue-100 transition-all duration-300 overflow-hidden cursor-pointer h-full flex flex-col">

        {/* Banner */}
        <div className="relative h-44 bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden">
          {event.banner_url ? (
            <img
              src={event.banner_url}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            // Placeholder when no banner
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-16 h-16 text-white opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Free / Paid badge */}
          <div className="absolute top-3 left-3">
            {event.is_free ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
                FREE
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white text-gray-800 shadow-sm">
                PKR {event.ticket_price?.toLocaleString()}
              </span>
            )}
          </div>

          {/* Event type badge */}
          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-black bg-opacity-40 text-white capitalize">
              {event.event_type}
            </span>
          </div>

          {/* Fully booked overlay */}
          {isFullyBooked && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="px-4 py-2 rounded-full bg-red-500 text-white font-bold text-sm">
                Fully Booked
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">

          {/* Category */}
          {event.category_name && (
            <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">
              {event.category_name}
            </span>
          )}

          {/* Title */}
          <h3 className="font-bold text-gray-900 text-base leading-snug mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
            {event.title}
          </h3>

          {/* Description */}
          {event.description && (
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">
              {event.description}
            </p>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Date and time */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatDate(event.start_datetime)} · {formatTime(event.start_datetime)}</span>
          </div>

          {/* Venue */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{event.venue ?? 'Online'}</span>
          </div>

          {/* Seats availability bar */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-400">
                {getSeatsLabel(event.seats_available, event.max_seats)}
              </span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getSeatsColor(fillPct)}`}
                style={{ width: `${Math.min(fillPct, 100)}%` }}
              />
            </div>
          </div>

        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-gray-200 rounded w-1/4" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-2 bg-gray-200 rounded w-full mt-4" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const [events, setEvents]         = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);

  // Filters
  const [activeTab, setActiveTab]       = useState<TabType>('upcoming');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch]             = useState('');
  const [searchInput, setSearchInput]   = useState('');

  const LIMIT = 12;
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // ─── Fetch categories once on mount ─────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/api/events/categories`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setCategories(res.data);
      })
      .catch(console.error);
  }, []);

  // ─── Fetch events when filters change ───────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: activeTab,
        page: String(page),
        limit: String(LIMIT),
      });

      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (search) {
        params.append('search', search);
      }

      const res = await fetch(`${API_URL}/api/events?${params.toString()}`);
      const json: EventsResponse = await res.json();

      if (json.data) {
        setEvents(json.data);
        setTotal(json.total);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedCategory, search, page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ─── Reset page when filters change ─────────────────────────────────────────
  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedCategory, search]);

  // ─── Search debounce ─────────────────────────────────────────────────────────
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const totalPages = Math.ceil(total / LIMIT);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* Google color bar */}
          <div className="h-1 w-16 flex mb-6 rounded-full overflow-hidden">
            <div className="flex-1 bg-[#4285F4]" />
            <div className="flex-1 bg-[#EA4335]" />
            <div className="flex-1 bg-[#FBBC05]" />
            <div className="flex-1 bg-[#34A853]" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Events
              </h1>
              <p className="mt-1 text-gray-500 text-sm">
                Workshops, seminars, hackathons and more from GDGOC-UITU
              </p>
            </div>

            {/* Total count */}
            {!loading && (
              <p className="text-sm text-gray-400">
                {total} event{total !== 1 ? 's' : ''} found
              </p>
            )}
          </div>

          {/* ── Search bar ── */}
          <div className="mt-6 relative max-w-md">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search events..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* ── Tabs ── */}
          <div className="mt-4 flex gap-1 border-b border-gray-200">
            {(['upcoming', 'past'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-semibold capitalize transition-all border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-[#4285F4] text-[#4285F4]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'upcoming' ? 'Upcoming' : 'Past Events'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Category filters ── */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#4285F4] text-white border-[#4285F4]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.category_id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                selectedCategory === cat.name
                  ? 'bg-[#4285F4] text-white border-[#4285F4]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* ── Events Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : events.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700">No events found</h3>
            <p className="text-sm text-gray-400 mt-1">
              {search
                ? `No results for "${search}"`
                : activeTab === 'past'
                ? 'No past events to show'
                : 'No upcoming events right now — check back soon!'
              }
            </p>
            {(search || selectedCategory !== 'all') && (
              <button
                onClick={() => { setSearchInput(''); setSelectedCategory('all'); }}
                className="mt-4 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {events.map((event) => (
              <EventCard key={event.event_id} event={event} />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              ← Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${
                  page === p
                    ? 'bg-[#4285F4] text-white'
                    : 'border border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}