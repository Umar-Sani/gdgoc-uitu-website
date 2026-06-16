'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import type { Transaction } from '@shared/types';

type TicketTransaction = Transaction & {
  event_id: string;
  banner_url: string | null;
  venue: string | null;
  is_online: boolean;
};

const STATUS_CONFIG = {
  success:  { label: 'Confirmed', color: 'bg-green-100 text-green-700 border-green-200' },
  pending:  { label: 'Pending',   color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  failed:   { label: 'Failed',    color: 'bg-red-100 text-red-700 border-red-200' },
  refunded: { label: 'Refunded',  color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export default function MyTicketsPage() {
  const router     = useRouter();
  const { user, token } = useAuth();

  const [tickets, setTickets]   = useState<TicketTransaction[]>([]);
  const [loading, setLoading]   = useState(true);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const LIMIT = 10;

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // ─── Redirect if not logged in ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) router.push('/login?redirect=/dashboard/tickets');
  }, [user]);

  // ─── Fetch tickets ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    setLoading(true);

    fetch(`${API_URL}/api/payments/my-tickets?page=${page}&limit=${LIMIT}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => {
        if (res.data) {
          setTickets(res.data);
          setTotal(res.total);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, page]);

  const totalPages = Math.ceil(total / LIMIT);

  // ─── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8 animate-pulse" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-gray-200 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Tickets</h1>
            <p className="text-sm text-gray-500 mt-1">
              {total} {total === 1 ? 'ticket' : 'tickets'} total
            </p>
          </div>
          <Link
            href="/events"
            className="px-4 py-2 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white text-sm font-semibold transition-all shadow-sm"
          >
            Browse Events
          </Link>
        </div>

        {/* Empty state */}
        {tickets.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-800">No Tickets Yet</h2>
            <p className="text-sm text-gray-500 mt-2">
              Register for events to see your tickets here.
            </p>
            <Link
              href="/events"
              className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all"
            >
              Browse Events
            </Link>
          </div>
        )}

        {/* Tickets list */}
        <div className="space-y-4">
          {tickets.map(ticket => {
            const statusConfig = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.pending;
            const eventDate = new Date(ticket.event_date).toLocaleDateString('en-PK', {
              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
            });
            const isPast = new Date(ticket.event_date) < new Date();

            return (
              <div
                key={ticket.transaction_id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md
                  ${isPast ? 'border-gray-100 opacity-75' : 'border-gray-100'}`}
              >
                <div className="flex gap-4 p-5">

                  {/* Event banner thumbnail */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-400 to-indigo-500">
                    {ticket.banner_url ? (
                      <img
                        src={ticket.banner_url}
                        alt={ticket.event_title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-white opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Ticket info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                        {ticket.event_title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0 ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {eventDate}
                      {isPast && <span className="text-gray-400 ml-1">(Past)</span>}
                    </p>

                    {ticket.venue && (
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {ticket.venue}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-gray-900">
                        PKR {ticket.amount?.toLocaleString()}
                      </span>

                      {ticket.status === 'success' && (
                        <Link
                          href={`/events/${ticket.event_id}`}
                          className="text-xs text-blue-500 hover:underline font-medium"
                        >
                          View Event →
                        </Link>
                      )}
                      {ticket.status === 'failed' && (
                        <Link
                          href={`/events/${ticket.event_id}/checkout`}
                          className="text-xs text-blue-500 hover:underline font-medium"
                        >
                          Try Again →
                        </Link>
                      )}
                    </div>

                    {ticket.invoice_number && (
                      <p className="text-xs text-gray-400 mt-1 font-mono">
                        {ticket.invoice_number}
                      </p>
                    )}
                  </div>
                </div>

                {/* Ticket bottom strip for confirmed tickets */}
                {ticket.status === 'success' && !isPast && (
                  <div className="px-5 py-2.5 bg-green-50 border-t border-green-100 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs font-medium text-green-700">
                      You're registered — See you there!
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600
                hover:border-blue-300 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600
                hover:border-blue-300 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        )}

      </div>
    </div>
  );
}