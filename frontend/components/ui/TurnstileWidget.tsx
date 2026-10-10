'use client';

import { useEffect, useRef } from 'react';

// Cloudflare Turnstile captcha (TODO-024). Renders nothing — and the forms behave exactly
// as before — unless NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. The backend is dormant in the
// same way until TURNSTILE_SECRET_KEY is set, so the two are switched on together.

export const TURNSTILE_ENABLED = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error('Turnstile failed to load')); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface Props {
  /** Called with a fresh single-use token, or null when it expires/errors. */
  onToken: (token: string | null) => void;
  /** Change this value to get a new challenge (tokens are single-use, so bump after each submit). */
  resetKey?: number;
}

export default function TurnstileWidget({ onToken, resetKey = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_ENABLED || !ref.current) return;
    let widgetId: string | undefined;
    let cancelled = false;

    onTokenRef.current(null);
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId = window.turnstile.render(ref.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [resetKey]);

  if (!TURNSTILE_ENABLED) return null;
  return <div ref={ref} className="min-h-[65px]" />;
}
