'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
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

function getDuration(start: string, end: string): string {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function getSeatsColor(fillPercentage: number): string {
  if (fillPercentage >= 90) return 'bg-red-500';
  if (fillPercentage >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();

  const [event, setEvent]       = useState<Event | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registered, setRegistered] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // ─── Fetch event ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!params.id) return;

    fetch(`${API_URL}/api/events/${params.id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error || !res.data) {
          setNotFound(true);
        } else {
          setEvent(res.data);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  // ─── Register for event ───────────────────────────────────────────────────────
  async function handleRegister() {
    if (!user) {
      router.push('/login');
      return;
    }

    setRegistering(true);
    setRegisterError('');

    try {
      const res = await fetch(`${API_URL}/api/events/${params.id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (!res.ok) {
        setRegisterError(json.error || 'Registration failed. Please try again.');
        return;
      }

      setRegistered(true);
      router.push(`/events/${params.id}/registered`);

    } catch {
      setRegisterError('Something went wrong. Please try again.');
    } finally {
      setRegistering(false);
    }
  }

  // ─── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-10 animate-pulse">
          <div className="h-64 bg-gray-200 rounded-2xl mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
            <div className="h-64 bg-gray-200 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Not found state ──────────────────────────────────────────────────────────
  if (notFound || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Event Not Found</h2>
          <p className="text-sm text-gray-500 mt-2">This event may have been removed or doesn't exist.</p>
          <Link
            href="/events"
            className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all"
          >
            Browse Events
          </Link>
        </div>
      </div>
    );
  }

  const isFullyBooked = event.seats_available === 0;
  const fillPct = event.fill_percentage ?? 0;
  const isPast = new Date(event.end_datetime) < new Date();

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Banner ── */}
      <div className="relative h-64 sm:h-80 bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden">
        {event.banner_url ? (
          <img
            src={event.banner_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-24 h-24 text-white opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent opacity-60" />

        {/* Back button */}
        <div className="absolute top-4 left-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white bg-opacity-20 backdrop-blur-sm text-white text-sm font-medium hover:bg-opacity-30 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        {/* Badges */}
        <div className="absolute top-4 right-4 flex gap-2">
          {event.is_free ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white">
              FREE
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-gray-800">
              PKR {event.ticket_price?.toLocaleString()}
            </span>
          )}
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black bg-opacity-40 text-white capitalize">
            {event.event_type}
          </span>
        </div>

        {/* Title overlay on banner */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          {event.category_name && (
            <span className="text-xs font-semibold text-blue-300 uppercase tracking-wide">
              {event.category_name}
            </span>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1 leading-tight">
            {event.title}
          </h1>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left — Description and tags ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Description */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">About This Event</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {event.description ?? 'No description provided.'}
              </p>
            </div>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* ── Right — Details and registration ── */}
          <div className="space-y-4">

            {/* Event details card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                Event Details
              </h2>

              <InfoRow
                icon={
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
                label="Date"
                value={formatDate(event.start_datetime)}
              />

              <InfoRow
                icon={
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                label="Time"
                value={`${formatTime(event.start_datetime)} — ${formatTime(event.end_datetime)} (${getDuration(event.start_datetime, event.end_datetime)})`}
              />

              <InfoRow
                icon={
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                label="Venue"
                value={event.venue ?? 'Online'}
              />

              <InfoRow
                icon={
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                label="Capacity"
                value={`${event.max_seats} attendees`}
              />

            </div>

            {/* Seats availability card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">Seats</span>
                <span className={`text-xs font-bold ${
                  isFullyBooked ? 'text-red-500' :
                  fillPct >= 70 ? 'text-yellow-500' : 'text-green-500'
                }`}>
                  {isFullyBooked ? 'Fully Booked' : `${event.seats_available} left`}
                </span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getSeatsColor(fillPct)}`}
                  style={{ width: `${Math.min(fillPct, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {event.seats_registered} / {event.max_seats} registered
              </p>
            </div>

            {/* Registration card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

              {/* Price */}
              <div className="mb-4 text-center">
                {event.is_free ? (
                  <span className="text-2xl font-bold text-green-500">Free</span>
                ) : (
                  <span className="text-2xl font-bold text-gray-900">
                    PKR {event.ticket_price?.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Error message */}
              {registerError && (
                <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 text-center">
                  {registerError}
                </div>
              )}

              {/* Register button */}
              {isPast ? (
                <div className="w-full py-3 rounded-xl bg-gray-100 text-gray-400 text-sm font-semibold text-center">
                  This event has ended
                </div>
              ) : isFullyBooked ? (
                <div className="w-full py-3 rounded-xl bg-red-50 text-red-400 text-sm font-semibold text-center border border-red-100">
                  Fully Booked
                </div>
              ) : !user ? (
                <Link
                  href="/login"
                  className="block w-full py-3 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white text-sm font-semibold text-center transition-all shadow-md hover:shadow-blue-200"
                >
                  Log in to Register
                </Link>
              ) : registered ? (
                <div className="w-full py-3 rounded-xl bg-green-50 text-green-600 text-sm font-semibold text-center border border-green-100">
                  ✓ Registered
                </div>
              ) : (
                <button
                  onClick={handleRegister}
                  disabled={registering}
                  className="w-full py-3 rounded-xl bg-[#4285F4] hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold transition-all shadow-md hover:shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {registering ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Registering...
                    </span>
                  ) : (
                    event.is_free ? 'Register for Free' : `Pay PKR ${event.ticket_price?.toLocaleString()}`
                  )}
                </button>
              )}

              {/* Login nudge */}
              {!user && (
                <p className="mt-3 text-center text-xs text-gray-400">
                  Don't have an account?{' '}
                  <Link href="/register" className="text-blue-500 hover:underline">
                    Sign up free
                  </Link>
                </p>
              )}

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}