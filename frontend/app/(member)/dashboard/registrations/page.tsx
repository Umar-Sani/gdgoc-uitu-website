'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

export default function MyRegistrationsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [regLoading, setRegLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    console.log('user:', user);
    console.log('token:', token);
    if (!user || !token) return;

    fetch(`${API_URL}/api/users/me/registrations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => setRegistrations(res.data ?? []))
      .catch(() => {})
      .finally(() => setRegLoading(false));
  }, [user, token]);

  if (loading || !user) return null;

  const now = new Date();
  const filtered = registrations.filter(r => {
    if (filter === 'upcoming') return new Date(r.start_datetime) > now;
    if (filter === 'past') return new Date(r.end_datetime) < now;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl border border-gray-200 hover:border-blue-300 transition-all"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Registrations</h1>
            <p className="text-sm text-gray-500 mt-0.5">{registrations.length} total registrations</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'upcoming', 'past'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                filter === f
                  ? 'bg-[#4285F4] text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        {regLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-gray-400 text-sm">No registrations found</p>
            <Link href="/events" className="mt-2 inline-block text-xs text-blue-500 hover:underline">
              Browse events →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(reg => {
              const isPast = new Date(reg.end_datetime) < now;
              const isUpcoming = new Date(reg.start_datetime) > now;

              return (
                <Link
                  key={reg.registration_id}
                  href={`/events/${reg.event_id}`}
                  className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-blue-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {reg.category_name && (
                          <span className="text-xs font-medium text-blue-500">{reg.category_name}</span>
                        )}
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-400 capitalize">{reg.event_type}</span>
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 truncate">{reg.title}</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(reg.start_datetime)} at {formatTime(reg.start_datetime)}
                      </p>
                      {reg.venue && (
                        <p className="text-xs text-gray-400 mt-0.5">📍 {reg.venue}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        isPast
                          ? 'bg-gray-50 text-gray-400 border-gray-100'
                          : isUpcoming
                          ? 'bg-green-50 text-green-600 border-green-100'
                          : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {isPast ? 'Past' : isUpcoming ? 'Upcoming' : 'Ongoing'}
                      </span>
                      <span className="text-xs font-medium text-gray-500">
                        {reg.is_free ? 'Free' : `PKR ${Number(reg.ticket_price).toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}