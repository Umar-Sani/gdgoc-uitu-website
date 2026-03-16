'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [form, setForm]         = useState({ full_name: '', email: '', subject: '', message: '' });
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.full_name.trim()) newErrors.full_name = 'Name is required.';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = 'A valid email is required.';
    if (!form.message.trim()) newErrors.message = 'Message is required.';
    if (form.message.trim().length < 10) newErrors.message = 'Message must be at least 10 characters.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setGeneralError('');

    try {
      const res = await fetch(`${API_URL}/api/cms/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (!res.ok) {
        setGeneralError(json.error || 'Failed to send message. Please try again.');
        return;
      }

      setSubmitted(true);

    } catch {
      setGeneralError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const inputClass = (hasError?: boolean) =>
    `w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${
      hasError
        ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
        : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
    }`;

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 py-20">
        <div className="h-1 w-full flex">
          <div className="flex-1 bg-[#4285F4]" />
          <div className="flex-1 bg-[#EA4335]" />
          <div className="flex-1 bg-[#FBBC05]" />
          <div className="flex-1 bg-[#34A853]" />
        </div>
        <div className="max-w-3xl mx-auto px-4 text-center pt-12">
          <h1 className="text-4xl font-bold text-white tracking-tight">Contact Us</h1>
          <p className="mt-4 text-blue-200 text-sm">
            Have a question or want to get involved? We'd love to hear from you.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <div className="h-1 w-12 flex mb-4 rounded-full overflow-hidden">
                <div className="flex-1 bg-[#4285F4]" />
                <div className="flex-1 bg-[#EA4335]" />
                <div className="flex-1 bg-[#FBBC05]" />
                <div className="flex-1 bg-[#34A853]" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Get in Touch</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Whether you want to join our team, sponsor an event, or just say hello — we're always happy to connect.
              </p>
            </div>

            {[
              { icon: '📍', label: 'Location', value: 'UIT University, Karachi, Pakistan' },
              { icon: '✉️', label: 'Email', value: 'gdgoc@uitu.edu.pk' },
              { icon: '🌐', label: 'Website', value: 'gdgoc.uitu.edu.pk' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{item.label}</p>
                  <p className="text-sm text-gray-800 mt-0.5">{item.value}</p>
                </div>
              </div>
            ))}

            <div className="pt-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Quick Links</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'View Events', href: '/events' },
                  { label: 'Join Forum', href: '/forum' },
                  { label: 'Meet Team', href: '/team' },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            {submitted ? (
              <div className="bg-green-50 border border-green-100 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Message Sent!</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Thanks for reaching out. We'll get back to you as soon as possible.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ full_name: '', email: '', subject: '', message: '' }); }}
                  className="mt-6 px-5 py-2.5 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                {generalError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                    {generalError}
                  </div>
                )}
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                      placeholder="Ahmad Ali"
                      className={inputClass(!!errors.full_name)}
                    />
                    {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="ahmad@example.com"
                      className={inputClass(!!errors.email)}
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                      placeholder="What's this about?"
                      className={inputClass()}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                      placeholder="Write your message here..."
                      rows={5}
                      className={inputClass(!!errors.message)}
                    />
                    {errors.message && <p className="mt-1 text-xs text-red-500">{errors.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white font-semibold text-sm transition-all shadow-md hover:shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending...
                      </span>
                    ) : 'Send Message'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}