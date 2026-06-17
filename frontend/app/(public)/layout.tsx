'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import SmoothScroll from '@/components/ui/smooth-scroll';
import NotificationBell from '@/components/ui/NotificationBell';

const NAV_LINKS = [
  { label: 'Events', href: '/events' },
  { label: 'Forum', href: '/forum' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isHero = pathname === '/';
  // Hide navbar on detail pages — forum threads and individual event pages
  const hideNav =
    (pathname.startsWith('/forum/') && pathname !== '/forum') ||
    /^\/events\/[^/]+$/.test(pathname);

  // ghost = transparent full-width navbar on ALL pages before scrolling past 80px
  const ghost = !scrolled;
  // lightGhost = ghost mode on pages with dark hero backgrounds (non-homepage)
  // → use white text, logolight, and light button styles
  const lightGhost = ghost && !isHero;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsVisible(true);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const initials = (user as any)?.full_name
    ? (user as any).full_name.charAt(0).toUpperCase()
    : user?.email
      ? user.email.charAt(0).toUpperCase()
      : 'U';

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F4F0]">

      {/* ── Navbar ── */}
      {!hideNav && (
        <div
          className={`fixed z-50 flex justify-center pointer-events-none transition-all duration-700 ease-[0.16,1,0.3,1]
            ${ghost ? 'top-0 left-0 right-0 px-0' : 'top-4 md:top-6 left-0 right-0 px-4 md:px-6'}
            ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          <nav
            className={`w-full pointer-events-auto relative transition-all duration-300 ease-in-out ${ghost
              ? 'max-w-full bg-transparent border-transparent shadow-none rounded-none'
              : 'max-w-[1200px] bg-white border-2 border-foreground rounded-2xl md:rounded-full shadow-[4px_4px_0_#000]'
              }`}
          >
            <div className="w-full h-13 md:h-14 flex items-center px-3 md:px-6">

              {/* Left — Nav links */}
              <div className="flex-1 hidden md:flex items-center gap-3 lg:gap-6">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-xs font-black tracking-widest uppercase transition-colors ${
                      pathname === link.href
                        ? lightGhost ? 'text-[#FBBC05]' : 'text-[#4285F4]'
                        : lightGhost
                          ? 'text-white/90 hover:text-white'
                          : 'text-foreground hover:text-[#4285F4]'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Center — Logo */}
              <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center hover:-translate-y-0.5 transition-transform group">
                <img
                  src={lightGhost ? '/images/logolight.png' : '/images/logodark.png'}
                  alt="GDGOC-UITU Logo"
                  className="h-8 md:h-10 w-auto object-contain"
                />
              </Link>

              {/* Right — Auth */}
              <div className="flex-1 hidden md:flex justify-end items-center gap-4">
                {user ? (
                  <div className="flex items-center gap-4 relative">
                    <Link
                      href="/dashboard"
                      className={`text-xs font-black tracking-widest uppercase transition-colors ${lightGhost ? 'text-white/90 hover:text-white' : 'text-foreground hover:text-[#4285F4]'}`}
                    >
                      Dashboard
                    </Link>

                    <NotificationBell light={lightGhost} />

                    <button
                      onClick={() => setProfileOpen(!profileOpen)}
                      onBlur={() => setTimeout(() => setProfileOpen(false), 200)}
                      className="w-7 h-7 rounded-full bg-[#4285F4] flex items-center justify-center hover:-translate-y-0.5 transition-all overflow-hidden"
                    >
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt={initials} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-black text-xs">{initials}</span>
                      )}
                    </button>

                    {profileOpen && (
                      <div className="absolute right-0 top-[calc(100%+16px)] w-48 bg-white border-[3px] border-foreground rounded-xl shadow-[6px_6px_0_#000] flex flex-col p-2 z-50">
                        <Link href={`/u/${user?.username}`} className="px-4 py-2 font-bold uppercase tracking-wide text-sm hover:bg-[#4285F4] hover:text-white transition-colors">
                          My Profile
                        </Link>
                        <Link href="/dashboard" className="px-4 py-2 font-bold uppercase tracking-wide text-sm hover:bg-[#4285F4] hover:text-white transition-colors">
                          Dashboard
                        </Link>
                        <Link href="/settings" className="px-4 py-2 font-bold uppercase tracking-wide text-sm hover:bg-[#4285F4] hover:text-white transition-colors">
                          Settings
                        </Link>
                        <button
                          onClick={() => { signOut(); setProfileOpen(false); }}
                          className="px-4 py-2 font-bold uppercase tracking-wide text-sm text-left hover:bg-[#FF4C4C] hover:text-white transition-colors border-t-[3px] border-foreground mt-1 pt-2"
                        >
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className={`text-xs font-black tracking-widest uppercase transition-colors ${lightGhost ? 'text-white/90 hover:text-white' : 'text-foreground hover:text-[#4285F4]'}`}
                    >
                      Log In
                    </Link>
                    <Link
                      href="/register"
                      className={`px-4 py-1.5 font-black uppercase tracking-widest text-xs rounded-full transition-all ${
                        !ghost
                          ? 'bg-[#FFED00] border-[3px] border-foreground text-foreground shadow-[4px_4px_0_#000] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0_#000] active:translate-y-1 active:translate-x-1 active:shadow-none'
                          : lightGhost
                            ? 'bg-white/15 border-[2px] border-white/50 text-white hover:bg-white/25 hover:border-white'
                            : 'bg-[#FFED00] border-[2px] border-foreground/60 text-foreground hover:border-foreground'
                      }`}
                    >
                      Join Free
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile — Hamburger */}
              <div className="flex-1 flex justify-end md:hidden">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={`w-10 h-10 flex items-center justify-center transition-all ${ghost
                    ? `bg-transparent border-[2px] rounded-lg ${lightGhost ? 'border-white/40' : 'border-foreground/40'}`
                    : 'bg-white border-[3px] border-foreground shadow-[2px_2px_0_#000] active:shadow-none active:translate-y-0.5 active:translate-x-0.5'
                    }`}
                >
                  {menuOpen ? (
                    <svg className={`w-5 h-5 ${lightGhost ? 'text-white' : 'text-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className={`w-5 h-5 ${lightGhost ? 'text-white' : 'text-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile menu dropdown (always light — renders over content) */}
            {menuOpen && (
              <div className="absolute top-[calc(100%+16px)] left-0 right-0 md:hidden border-[3px] border-foreground rounded-2xl bg-white flex flex-col p-4 shadow-[6px_6px_0_#000] z-50 overflow-hidden">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block py-3 font-black uppercase tracking-widest text-foreground hover:text-[#4285F4] border-b-[3px] border-foreground border-opacity-20"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-4 flex flex-col gap-3">
                  {user ? (
                    <>
                      <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block py-3 font-black uppercase tracking-widest text-foreground hover:text-[#4285F4]">
                        Dashboard
                      </Link>
                      <Link href={`/u/${user?.username}`} onClick={() => setMenuOpen(false)} className="block py-3 font-black uppercase tracking-widest text-foreground hover:text-[#4285F4]">
                        My Profile
                      </Link>
                      <div className="flex items-center gap-2 py-2">
                        <span className="font-black uppercase tracking-widest text-sm text-foreground">Notifications</span>
                        <NotificationBell />
                      </div>
                      <button
                        onClick={() => { signOut(); setMenuOpen(false); }}
                        className="w-full py-3 text-left font-black uppercase tracking-widest text-[#FF4C4C] hover:text-red-700"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setMenuOpen(false)} className="block py-3 font-black uppercase tracking-widest text-foreground hover:text-[#4285F4]">
                        Log In
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setMenuOpen(false)}
                        className="w-full block py-3 text-center bg-[#FFED00] border-[3px] border-foreground text-foreground font-black uppercase tracking-widest text-sm shadow-[4px_4px_0_#000] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all mt-2"
                      >
                        Join Free
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </nav>
        </div>
      )}

      {/* ── Page Content ── */}
      <main className="flex-1">
        <SmoothScroll>
          {children}
        </SmoothScroll>
      </main>

    </div>
  );
}
