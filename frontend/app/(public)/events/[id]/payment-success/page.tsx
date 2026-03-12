'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

type TransactionDetail = {
  transaction_id: string;
  status: string;
  amount: number;
  currency: string;
  invoice_number: string | null;
  initiated_at: string;
  completed_at: string | null;
  event_title: string;
  event_date: string;
  event_id: string;
};

export default function PaymentSuccessPage() {
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { token }    = useAuth();

  const transactionId = searchParams.get('transaction_id');
  const sessionId     = searchParams.get('session_id');

  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading]         = useState(true);
  const [countdown, setCountdown]     = useState(10);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // ─── Verify payment and fetch transaction details ─────────────────────────
  useEffect(() => {
    if (!transactionId || !token) return;

    // Poll up to 5 times with 2s delay — webhook may take a moment to process
    let attempts = 0;

    async function verify() {
      try {
        const res = await fetch(
          `${API_URL}/api/payments/verify-session?transaction_id=${transactionId}&session_id=${sessionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const json = await res.json();

        if (json.data) {
          setTransaction(json.data);
          setLoading(false);
          return;
        }

        // Retry if webhook hasn't processed yet
        attempts++;
        if (attempts < 5) {
          setTimeout(verify, 2000);
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    }

    verify();
  }, [transactionId, token]);

  // ─── Auto redirect countdown ──────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    if (countdown <= 0) {
      router.push('/dashboard/tickets');
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [loading, countdown, router]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 text-center max-w-md w-full">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
            <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
          <p className="text-gray-600 font-medium">Confirming your payment...</p>
          <p className="text-sm text-gray-400 mt-1">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Green accent bar on success */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#34A853] via-green-400 to-emerald-500" />

          <div className="px-8 py-10 text-center">

            {/* Animated success icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 relative mb-5">
              <div className="absolute inset-0 rounded-full border-4 border-green-200 animate-ping opacity-20" />
              <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payment Successful!</h1>
            <p className="text-sm text-gray-500 mt-2">
              You're registered for the event. See you there! 🎉
            </p>

            {/* Transaction details */}
            {transaction && (
              <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-100 text-left space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Receipt
                </p>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Event</span>
                  <span className="font-medium text-gray-800 text-right max-w-[60%]">
                    {transaction.event_title}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount Paid</span>
                  <span className="font-medium text-gray-800">
                    PKR {transaction.amount?.toLocaleString()}
                  </span>
                </div>

                {transaction.invoice_number && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Invoice</span>
                    <span className="font-mono text-xs text-gray-600">
                      {transaction.invoice_number}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className="text-green-600 font-semibold capitalize">
                    {transaction.status}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Transaction ID</span>
                  <span className="font-mono text-xs text-gray-500 truncate max-w-[60%]">
                    {transaction.transaction_id}
                  </span>
                </div>
              </div>
            )}

            {/* Auto redirect notice */}
            <div className="mt-5 p-3 rounded-xl bg-green-50 border border-green-100">
              <p className="text-sm text-green-700">
                Redirecting to My Tickets in{' '}
                <span className="font-bold text-green-800">{countdown}</span> seconds...
              </p>
              <div className="mt-2 h-1 w-full bg-green-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-1000"
                  style={{ width: `${((10 - countdown) / 10) * 100}%` }}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-5 flex flex-col gap-3">
              <Link
                href="/dashboard/tickets"
                className="block w-full py-3 rounded-xl bg-[#34A853] hover:bg-green-600
                  text-white font-semibold text-sm transition-all shadow-md hover:shadow-green-200 text-center"
              >
                View My Tickets
              </Link>
              <Link
                href="/events"
                className="block w-full py-3 rounded-xl border border-gray-200
                  text-gray-600 hover:border-blue-300 hover:text-blue-600
                  font-semibold text-sm transition-all text-center"
              >
                Browse More Events
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}