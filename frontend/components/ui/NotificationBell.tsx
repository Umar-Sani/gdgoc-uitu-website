'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Bell, BellRing, Calendar, MessageSquare, ThumbsUp,
  Clock, Shield, Megaphone, AtSign, X, CheckCheck,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type NotificationType =
  | 'event_reminder'
  | 'registration_confirmed'
  | 'new_reply'
  | 'upvote_received'
  | 'report_reviewed'
  | 'system_announcement'
  | 'mention';

type Notification = {
  notification_id: string;
  type: NotificationType;
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
};

const TYPE_META: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  registration_confirmed: { icon: Calendar,      color: 'text-[#34A853]', bg: 'bg-green-50' },
  new_reply:              { icon: MessageSquare, color: 'text-[#4285F4]', bg: 'bg-blue-50'  },
  upvote_received:        { icon: ThumbsUp,      color: 'text-[#FBBC05]', bg: 'bg-yellow-50'},
  event_reminder:         { icon: Clock,         color: 'text-[#EA4335]', bg: 'bg-red-50'   },
  report_reviewed:        { icon: Shield,        color: 'text-purple-500', bg: 'bg-purple-50'},
  system_announcement:    { icon: Megaphone,     color: 'text-[#4285F4]', bg: 'bg-blue-50'  },
  mention:                { icon: AtSign,        color: 'text-[#EA4335]', bg: 'bg-red-50'   },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}

export default function NotificationBell({ light = false }: { light?: boolean }) {
  const { token, user } = useAuth();
  const router = useRouter();

  const [open,         setOpen]         = useState(false);
  const [unread,       setUnread]       = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingList,  setLoadingList]  = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // ── Fetch unread count (lightweight, runs on interval) ──────────────────────
  const fetchCount = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch(`${API_URL}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) setUnread(json.data.count);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    if (!user) return;
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, [user, fetchCount]);

  // ── Fetch full list when panel opens ────────────────────────────────────────
  const fetchList = useCallback(async () => {
    if (!token) return;
    setLoadingList(true);
    try {
      const res  = await fetch(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) setNotifications(json.data);
    } catch { /* ignore */ }
    finally { setLoadingList(false); }
  }, [token]);

  useEffect(() => {
    if (open) fetchList();
  }, [open, fetchList]);

  // ── Close on outside click ───────────────────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current  && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Mark one as read ────────────────────────────────────────────────────────
  async function markRead(id: string) {
    try {
      await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => n.notification_id === id ? { ...n, is_read: true } : n));
      setUnread((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  }

  // ── Mark all as read ────────────────────────────────────────────────────────
  async function markAllRead() {
    try {
      await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch { /* ignore */ }
  }

  // ── Delete one ──────────────────────────────────────────────────────────────
  async function deleteOne(id: string, wasRead: boolean) {
    try {
      await fetch(`${API_URL}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((n) => n.notification_id !== id));
      if (!wasRead) setUnread((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  }

  // ── Click notification ───────────────────────────────────────────────────────
  function handleNotificationClick(n: Notification) {
    if (!n.is_read) markRead(n.notification_id);
    if (n.action_url) router.push(n.action_url);
    setOpen(false);
  }

  if (!user) return null;

  const hasUnread = unread > 0;

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className={`relative w-8 h-8 flex items-center justify-center rounded-full transition-all hover:-translate-y-0.5 ${
          light
            ? 'text-white/80 hover:text-white hover:bg-white/10'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`}
        aria-label="Notifications"
      >
        {hasUnread ? (
          <BellRing className="w-5 h-5" />
        ) : (
          <Bell className="w-5 h-5" />
        )}

        {/* Unread badge */}
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#EA4335] text-white text-[9px] font-black flex items-center justify-center leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+12px)] w-[22rem] sm:w-[26rem] bg-white rounded-2xl border-2 border-gray-100 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.18)] z-50 overflow-hidden"
          style={{ maxHeight: '480px', display: 'flex', flexDirection: 'column' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <span className="text-sm font-bold text-gray-900">Notifications</span>
            {hasUnread && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#4285F4] hover:text-blue-700 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {loadingList ? (
              <div className="py-10 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-[#4285F4] border-t-transparent animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-3 text-center px-6">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-500">All caught up!</p>
                <p className="text-xs text-gray-400">No notifications yet.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = TYPE_META[n.type] ?? TYPE_META.system_announcement;
                const Icon = meta.icon;
                return (
                  <div
                    key={n.notification_id}
                    className={`group flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${
                      n.is_read ? 'hover:bg-gray-50' : 'bg-blue-50/40 hover:bg-blue-50/70'
                    }`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    {/* Type icon */}
                    <div className={`w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold leading-snug ${n.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                        {n.title}
                      </p>

                      {n.message && (
                        (n.type === 'new_reply' || n.type === 'mention') ? (
                          /* Quoted content snippet */
                          <div className="mt-1.5 pl-2.5 border-l-2 border-gray-200">
                            <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 italic">
                              {n.message}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 leading-relaxed mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                        )
                      )}

                      <p className="text-[10px] text-gray-400 mt-1.5">{timeAgo(n.created_at)}</p>
                    </div>

                    {/* Unread dot + delete */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[#4285F4] flex-shrink-0" />
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteOne(n.notification_id, n.is_read); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-gray-200"
                        aria-label="Dismiss"
                      >
                        <X className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
