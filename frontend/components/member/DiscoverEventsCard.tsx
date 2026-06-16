'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, MapPin, Calendar, ArrowRight } from 'lucide-react';
import type { Event } from '@shared/types';
import { formatDate } from '@/lib/formatters';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function DiscoverEventsCard() {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/events?status=upcoming&limit=1`)
      .then(r => r.json())
      .then(res => setEvent(res.data?.[0] ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#4285F4] to-indigo-600 p-6 text-white overflow-hidden relative">
      {/* Decorative glow */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide text-white/80">Discover Events</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-5 w-3/4 bg-white/20 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-white/20 rounded animate-pulse" />
          </div>
        ) : event ? (
          <>
            <h3 className="text-lg font-bold leading-snug mb-2 line-clamp-2">{event.title}</h3>

            <div className="space-y-1.5 mb-5 text-sm text-white/85">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{formatDate(event.start_datetime)}</span>
              </div>
              {(event.is_online || event.venue) && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{event.is_online ? 'Online' : event.venue}</span>
                </div>
              )}
            </div>

            <Link
              href="/events"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white text-[#4285F4] text-sm font-semibold hover:bg-white/90 transition-all group"
            >
              Browse all events
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold leading-snug mb-2">No upcoming events</h3>
            <p className="text-sm text-white/85 mb-5">Check back soon — new events are added regularly.</p>
            <Link
              href="/events"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white text-[#4285F4] text-sm font-semibold hover:bg-white/90 transition-all group"
            >
              Browse events
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
