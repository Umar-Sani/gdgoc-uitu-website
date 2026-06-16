'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, CalendarDays, MessageSquare, Ticket,
  Settings, LogOut, ShieldCheck,
} from 'lucide-react';

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',       href: '/dashboard',               icon: <LayoutDashboard className="w-4 h-4" />, exact: true },
  { label: 'Events',          href: '/events',                  icon: <CalendarDays className="w-4 h-4" /> },
  { label: 'Forum',           href: '/forum',                   icon: <MessageSquare className="w-4 h-4" /> },
  { label: 'My Registrations', href: '/dashboard/registrations', icon: <Ticket className="w-4 h-4" /> },
  { label: 'Settings',        href: '/settings',                icon: <Settings className="w-4 h-4" /> },
];

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function MemberSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  if (!user) return null;

  const isAdminRole = ['editor', 'admin', 'super_admin'].includes(user.role_name);

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-gray-100 shadow-sm
      flex flex-col transition-transform duration-200
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:translate-x-0 lg:static lg:z-auto
    `}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
          <img src="/images/logodark.png" alt="GDGOC-UITU" className="h-11 w-auto object-contain" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-blue-50 text-[#4285F4]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}

        {isAdminRole && (
          <div className="pt-3 mt-3 border-t border-gray-100">
            <Link
              href="/admin/dashboard"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              Admin Dashboard
            </Link>
          </div>
        )}
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} className="w-8 h-8 object-cover" />
            ) : (
              getInitials(user.full_name || 'M')
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">{user.full_name}</p>
            <p className="text-xs text-gray-400 truncate capitalize">{user.role_name?.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full mt-2 px-3 py-2 rounded-xl text-xs font-medium text-red-500 hover:bg-red-50 transition-all text-left flex items-center gap-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
