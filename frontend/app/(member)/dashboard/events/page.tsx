'use client';

import Link from 'next/link';
import type { Event } from '@shared/types';
import { useMemberData } from '@/context/MemberDataContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-PK', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function getSeatsColor(pct: number): string {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getSeatsLabel(available: number, max: number): string {
  if (available === 0) return 'Fully Booked';
  if (available <= 5) return `Only ${available} left!`;
  return `${available} / ${max} seats available`;
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: Event }) {
  const fillPct = event.fill_percentage ?? 0;
  const isFullyBooked = event.seats_available === 0;

  return (
    <Link href={`/events/${event.event_id}`}>
      <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-blue-100 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col">

        {/* Banner */}
        <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden">
          {event.banner_url ? (
            <img
              src={event.banner_url}
              alt={event.title}
              className="w-full h-auto block group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="h-44 w-full flex items-center justify-center">
              <svg className="w-16 h-16 text-white opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          <div className="absolute top-3 left-3">
            {event.is_free ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">FREE</span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white text-gray-800 shadow-sm">
                PKR {event.ticket_price?.toLocaleString()}
              </span>
            )}
          </div>

          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-black bg-opacity-40 text-white capitalize">
              {event.event_type}
            </span>
          </div>

          {isFullyBooked && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="px-4 py-2 rounded-full bg-red-500 text-white font-bold text-sm">Fully Booked</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          {event.category_name && (
            <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">
              {event.category_name}
            </span>
          )}

          <h3 className="font-bold text-gray-900 text-base leading-snug mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
            {event.title}
          </h3>

          {event.description && (
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">{event.description}</p>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatDate(event.start_datetime)} · {formatTime(event.start_datetime)}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{event.venue ?? 'Online'}</span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-400">{getSeatsLabel(event.seats_available, event.max_seats)}</span>
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

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-gray-200 rounded w-1/4" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-2 bg-gray-200 rounded w-full mt-4" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MemberEventsPage() {
  const { events, eventsLoading } = useMemberData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upcoming Events</h1>
          <p className="text-sm text-gray-500 mt-1">
            Workshops, seminars, and hackathons from GDGOC-UITU
          </p>
        </div>
      </div>

      {eventsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700">No upcoming events</h3>
          <p className="text-sm text-gray-400 mt-1">Check back soon — new events are added regularly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.event_id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
