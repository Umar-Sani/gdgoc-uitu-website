'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

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

  const isHero = pathname === '/';
  // Show ghost (transparent) mode only on the hero page before scrolling
  const ghost = isHero && !scrolled;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Helper to get initials
  const initials = (user as any)?.full_name
    ? (user as any).full_name.charAt(0).toUpperCase()
    : user?.email
      ? user.email.charAt(0).toUpperCase()
      : 'U';

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F4F0]">

      {/* ── Navbar: always fixed, transitions top offset + styles ── */}
      <div
        className={`fixed z-50 flex justify-center pointer-events-none transition-all duration-300 ease-in-out ${ghost
            ? 'top-0 left-0 right-0 px-0'          // flush to top, no side gap
            : 'top-4 md:top-6 left-0 right-0 px-4 md:px-6' // floating pill offset
          }`}
      >
        <nav
          className={`w-full pointer-events-auto relative transition-all duration-300 ease-in-out ${ghost
              ? 'max-w-full bg-transparent border-transparent shadow-none rounded-none'
              : 'max-w-[1200px] bg-white border-[3px] border-foreground rounded-2xl md:rounded-full shadow-[6px_6px_0_#000]'
            }`}
        >
          <div className="w-full h-13 md:h-14 flex items-center px-3 md:px-6">

            {/* Left Column — Navigation links */}
            <div className="flex-1 hidden md:flex items-center gap-3 lg:gap-6">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs font-black tracking-widest uppercase transition-colors ${pathname === link.href
                      ? 'text-[#4285F4]'
                      : ghost
                        ? 'text-foreground hover:text-[#4285F4]'
                        : 'text-foreground hover:text-[#4285F4]'
                    }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Center Column — Logo (Absolutely positioned) */}
            <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 hover:-translate-y-0.5 transition-transform group">
              <svg viewBox="0 0 24 24" className="w-5 h-5 drop-shadow-[1px_1px_0_#000]">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="font-black text-sm tracking-tighter uppercase text-foreground">GDGOC-UITU</span>
            </Link>

            {/* Right Column — Auth-aware */}
            <div className="flex-1 hidden md:flex justify-end items-center gap-4">
              {user ? (
                <div className="flex items-center gap-6 relative">
                  <Link
                    href="/dashboard"
                    className="text-xs font-black tracking-widest uppercase text-foreground hover:text-[#4285F4] transition-colors"
                  >
                    Dashboard
                  </Link>

                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    onBlur={() => setTimeout(() => setProfileOpen(false), 200)}
                    className={`w-7 h-7 rounded-full bg-[#4285F4] flex items-center justify-center hover:-translate-y-0.5 transition-all ${ghost
                        ? 'border-[2px] border-foreground/40 shadow-none'
                        : 'border-[3px] border-foreground shadow-[3px_3px_0_#000]'
                      }`}
                  >
                    <span className="text-white font-black text-xs">{initials}</span>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-[calc(100%+16px)] w-48 bg-white border-[3px] border-foreground rounded-xl shadow-[6px_6px_0_#000] flex flex-col p-2 z-50">
                      <Link href="/profile" className="px-4 py-2 font-bold uppercase tracking-wide text-sm hover:bg-[#4285F4] hover:text-white transition-colors">
                        My Profile
                      </Link>
                      <Link href="/dashboard" className="px-4 py-2 font-bold uppercase tracking-wide text-sm hover:bg-[#4285F4] hover:text-white transition-colors">
                        Dashboard
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
                    className="text-xs font-black tracking-widest uppercase text-foreground hover:text-[#4285F4] transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className={`px-4 py-1.5 font-black uppercase tracking-widest text-xs rounded-full transition-all ${ghost
                        ? 'bg-[#FFED00] border-[2px] border-foreground/60 text-foreground hover:border-foreground'
                        : 'bg-[#FFED00] border-[3px] border-foreground text-foreground shadow-[4px_4px_0_#000] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0_#000] active:translate-y-1 active:translate-x-1 active:shadow-none'
                      }`}
                  >
                    Join Free
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex-1 flex justify-end md:hidden">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`w-10 h-10 flex items-center justify-center transition-all ${ghost
                    ? 'bg-transparent border-[2px] border-foreground/40 rounded-lg'
                    : 'bg-white border-[3px] border-foreground shadow-[2px_2px_0_#000] active:shadow-none active:translate-y-0.5 active:translate-x-0.5'
                  }`}
              >
                {menuOpen ? (
                  <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
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
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="block py-3 font-black uppercase tracking-widest text-foreground hover:text-[#4285F4]">
                      My Profile
                    </Link>
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

      {/* ── Page Content ── */}
      {/* Padding is CONSTANT — never changes on scroll, preventing layout jitter. */}
      <main className="flex-1">
        {children}
      </main>

    </div>
  );
}