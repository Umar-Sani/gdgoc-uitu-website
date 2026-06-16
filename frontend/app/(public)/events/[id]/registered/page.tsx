'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Event } from '@shared/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RegistrationConfirmedPage() {
  const params = useParams();
  const router = useRouter();

  const [event, setEvent]     = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // ─── Fetch event details ──────────────────────────────────────────────────
  useEffect(() => {
    if (!params.id) return;

    fetch(`${API_URL}/api/events/${params.id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setEvent(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-pulse text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-gray-200 mx-auto" />
          <div className="h-6 bg-gray-200 rounded w-48 mx-auto" />
          <div className="h-4 bg-gray-200 rounded w-64 mx-auto" />
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

        {/* Google color accent bar */}
        <div className="h-1.5 w-full flex">
          <div className="flex-1 bg-[#4285F4]" />
          <div className="flex-1 bg-[#EA4335]" />
          <div className="flex-1 bg-[#FBBC05]" />
          <div className="flex-1 bg-[#34A853]" />
        </div>

        <div className="px-8 py-10 text-center">

          {/* Animated success icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-green-200 animate-ping opacity-20" />
            <svg
              className="w-10 h-10 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            You're Registered!
          </h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Your spot has been confirmed. We'll see you there!
          </p>

          {/* Event details */}
          {event && (
            <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-100 text-left space-y-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                Event Details
              </p>

              <div>
                <p className="text-sm font-bold text-gray-900">{event.title}</p>
                {event.category_name && (
                  <p className="text-xs text-blue-500 mt-0.5">{event.category_name}</p>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-600">
                <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{formatDate(event.start_datetime)} · {formatTime(event.start_datetime)}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-600">
                <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{event.venue ?? 'Online'}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-600">
                <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <span>
                  {event.is_free ? (
                    <span className="text-green-600 font-semibold">Free Entry</span>
                  ) : (
                    <span>PKR {event.ticket_price?.toLocaleString()}</span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* What's next */}
          <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-100 text-left">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              What's Next
            </p>
            <ul className="space-y-1.5">
              {[
                'Add this event to your calendar',
                'Check your email for confirmation details',
                'Arrive 10 minutes early on the day',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/events"
              className="block w-full py-3 px-6 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white font-semibold text-sm transition-all shadow-md hover:shadow-blue-200 text-center"
            >
              Browse More Events
            </Link>
            <button
              onClick={() => router.back()}
              className="w-full py-3 px-6 rounded-xl border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 font-semibold text-sm transition-all"
            >
              Back to Event
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}