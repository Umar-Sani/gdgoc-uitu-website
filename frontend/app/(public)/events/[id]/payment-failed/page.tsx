'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PaymentFailedPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('transaction_id');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-rose-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Red accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#EA4335] via-red-400 to-rose-500" />

          <div className="px-8 py-10 text-center">

            {/* Error icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 mb-5">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payment Failed</h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Your payment was not completed. You have not been charged.
            </p>

            {/* Reasons */}
            <div className="mt-6 bg-red-50 rounded-xl p-4 border border-red-100 text-left">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-3">
                Common Reasons
              </p>
              <ul className="space-y-2 text-sm text-red-600">
                {[
                  'Card was declined by your bank',
                  'Insufficient funds',
                  'Payment was cancelled',
                  'Session expired',
                ].map((reason, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            {/* Transaction ID if available */}
            {transactionId && (
              <p className="mt-4 text-xs text-gray-400">
                Reference: <span className="font-mono">{transactionId}</span>
              </p>
            )}

            {/* Action buttons */}
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href={`/events/${params.id}/checkout`}
                className="block w-full py-3 rounded-xl bg-[#4285F4] hover:bg-blue-600
                  text-white font-semibold text-sm transition-all shadow-md hover:shadow-blue-200 text-center"
              >
                Try Again
              </Link>
              <Link
                href={`/events/${params.id}`}
                className="block w-full py-3 rounded-xl border border-gray-200
                  text-gray-600 hover:border-gray-300 hover:text-gray-800
                  font-semibold text-sm transition-all text-center"
              >
                Back to Event
              </Link>
              <Link
                href="/events"
                className="block text-sm text-gray-400 hover:text-gray-600 transition-colors text-center"
              >
                Browse Other Events
              </Link>
            </div>

            {/* Support note */}
            <p className="mt-6 text-xs text-gray-400">
              Need help?{' '}
              <Link href="/contact" className="text-blue-500 hover:underline">
                Contact Support
              </Link>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}