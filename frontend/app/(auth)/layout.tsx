import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: {
    template: '%s | GDGOC-UITU',
    default: 'GDGOC-UITU',
  },
  description: 'Google Developer Group On Campus — UIT University Karachi',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">

      {/* Minimal top nav for auth pages */}
      <header className="w-full px-6 py-4 flex items-center justify-between bg-white border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2 group">
          {/* Google G icon */}
          <svg viewBox="0 0 24 24" className="w-7 h-7">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="font-bold text-gray-800 text-sm tracking-tight group-hover:text-blue-600 transition-colors">
            GDGOC-UITU
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/events"
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            Events
          </Link>
          <Link
            href="/about"
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            About
          </Link>
          <Link
            href="/login"
            className="px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-all text-sm font-medium"
          >
            Log in
          </Link>
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Minimal footer */}
      <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-100">
        © {new Date().getFullYear()} GDGOC-UITU · UIT University, Karachi
      </footer>

    </div>
  );
}