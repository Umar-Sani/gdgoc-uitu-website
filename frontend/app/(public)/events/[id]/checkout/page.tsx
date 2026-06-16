'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import type { Event } from '@shared/types';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();

  const [event, setEvent]       = useState<Event | null>(null);
  const [loading, setLoading]   = useState(true);
  const [paying, setPaying]     = useState(false);
  const [error, setError]       = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // ─── Redirect if not logged in ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      router.push(`/login?redirect=/events/${params.id}/checkout`);
    }
  }, [user]);

  // ─── Fetch event ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!params.id) return;

    fetch(`${API_URL}/api/events/${params.id}`)
      .then(r => r.json())
      .then(res => {
        if (res.error || !res.data) {
          router.push('/events');
        } else if (res.data.is_free) {
          // Free events should not reach checkout
          router.push(`/events/${params.id}`);
        } else {
          setEvent(res.data);
        }
      })
      .catch(() => router.push('/events'))
      .finally(() => setLoading(false));
  }, [params.id]);

  // ─── Create Stripe checkout session and redirect ──────────────────────────
  async function handlePay() {
    if (!token || !event) return;

    setPaying(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/payments/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ event_id: params.id }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Failed to start checkout. Please try again.');
        return;
      }

      // Redirect to Stripe hosted checkout page
      window.location.href = json.data.checkout_url;

    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setPaying(false);
    }
  }

  // ─── Loading ──────────────────────────────────────────────────────────────────
  if (loading || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-md px-4">
          <div className="h-8 bg-gray-200 rounded w-2/3 mx-auto" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
          <div className="h-12 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.start_datetime).toLocaleDateString('en-PK', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const eventTime = new Date(event.start_datetime).toLocaleTimeString('en-PK', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Back link */}
        <Link
          href={`/events/${params.id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Event
        </Link>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Google color accent bar */}
          <div className="h-1.5 w-full flex">
            <div className="flex-1 bg-[#4285F4]" />
            <div className="flex-1 bg-[#EA4335]" />
            <div className="flex-1 bg-[#FBBC05]" />
            <div className="flex-1 bg-[#34A853]" />
          </div>

          <div className="px-8 py-8">

            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 mb-3">
                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Order Summary</h1>
              <p className="text-sm text-gray-500 mt-1">Review your order before paying</p>
            </div>

            {/* Event summary card */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
              {event.banner_url && (
                <img
                  src={event.banner_url}
                  alt={event.title}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
              )}
              <h2 className="font-semibold text-gray-900 text-sm">{event.title}</h2>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {eventDate} at {eventTime}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {event.venue ?? 'Online'}
                </p>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Ticket (1x)</span>
                <span>PKR {event.ticket_price?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Processing fee</span>
                <span className="text-green-500">Free</span>
              </div>
              <div className="h-px bg-gray-100 my-2" />
              <div className="flex justify-between font-bold text-gray-900">
                <span>Total</span>
                <span>PKR {event.ticket_price?.toLocaleString()}</span>
              </div>
            </div>

            {/* Buyer info */}
            <div className="bg-blue-50 rounded-xl p-3 mb-6 border border-blue-100">
              <p className="text-xs font-semibold text-blue-700 mb-1">Purchasing as</p>
              <p className="text-sm font-medium text-blue-900">{user?.full_name || 'Member'}</p>
              <p className="text-xs text-blue-600">{user?.email}</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 text-center">
                {error}
              </div>
            )}

            {/* Pay button */}
            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full py-3.5 px-6 rounded-xl bg-[#4285F4] hover:bg-blue-600 active:bg-blue-700
                text-white font-semibold text-sm transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
                shadow-md hover:shadow-lg hover:shadow-blue-200"
            >
              {paying ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Redirecting to Stripe...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Pay PKR {event.ticket_price?.toLocaleString()} via Stripe
                </span>
              )}
            </button>

            {/* Security notice */}
            <p className="mt-3 text-center text-xs text-gray-400 flex items-center justify-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Secured by Stripe. We never store your card details.
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}