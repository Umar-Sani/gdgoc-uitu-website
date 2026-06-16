'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Event } from '@shared/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Lightweight thread shape used by the member-area lists. The forum threads
 * endpoint returns more fields than this, but these are all we render in the
 * dashboard card and the member Forums page.
 */
export type MemberThread = {
  thread_id: string;
  title: string;
  body_preview: string | null;
  category_name: string | null;
  category_color: string | null;
  tags: string[] | null;
  is_pinned: boolean;
  view_count: number;
  reply_count: number;
  upvote_count: number;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
};

type MemberData = {
  events: Event[];
  eventsLoading: boolean;
  threads: MemberThread[];
  threadsLoading: boolean;
};

const MemberDataContext = createContext<MemberData | undefined>(undefined);

/**
 * Fetches the upcoming events + latest forum threads ONCE for the whole member
 * area. The dashboard cards and the dedicated Events / Forums pages all read
 * from here, so moving between those pages never triggers another request —
 * keeps the database load to a single query per list per session.
 */
export function MemberDataProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [threads, setThreads] = useState<MemberThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/events?status=upcoming&limit=24`)
      .then((r) => r.json())
      .then((res) => setEvents(res.data ?? []))
      .catch(() => {})
      .finally(() => setEventsLoading(false));

    fetch(`${API_URL}/api/forum/threads?sort=latest&limit=20`)
      .then((r) => r.json())
      .then((res) => setThreads(res.data ?? []))
      .catch(() => {})
      .finally(() => setThreadsLoading(false));
  }, []);

  return (
    <MemberDataContext.Provider value={{ events, eventsLoading, threads, threadsLoading }}>
      {children}
    </MemberDataContext.Provider>
  );
}

export function useMemberData(): MemberData {
  const ctx = useContext(MemberDataContext);
  if (!ctx) throw new Error('useMemberData must be used within a MemberDataProvider');
  return ctx;
}
