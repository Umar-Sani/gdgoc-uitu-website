'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type AboutSection = {
  section_id: number;
  section_key: string;
  title: string;
  body: string;
  display_order: number;
};

export default function AboutPage() {
  const [sections, setSections] = useState<AboutSection[]>([]);
  const [loading, setLoading]   = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    fetch(`${API_URL}/api/cms/about`)
      .then((r) => r.json())
      .then((res) => { if (res.data) setSections(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
          <h1 className="text-4xl font-bold text-white tracking-tight">About Us</h1>
          <p className="mt-4 text-blue-200 text-sm leading-relaxed">
            Learn about our mission, values, and the community we're building at UIT University.
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-3">
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          ))
        ) : sections.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-16">Content coming soon.</p>
        ) : (
          sections
            .sort((a, b) => a.display_order - b.display_order)
            .map((section, index) => (
              <div key={section.section_id} className="flex gap-8">
                <div className="flex-shrink-0 w-1 rounded-full bg-gradient-to-b from-[#4285F4] via-[#FBBC05] to-[#34A853]" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-3">{section.title}</h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{section.body}</p>
                </div>
              </div>
            ))
        )}
      </div>

      {/* CTA */}
      <div className="bg-gray-50 py-16 text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-3">Want to be part of this?</h3>
        <p className="text-sm text-gray-500 mb-6">Join our community and start building with us.</p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register" className="px-6 py-3 rounded-xl bg-[#4285F4] text-white font-semibold text-sm hover:bg-blue-600 transition-all shadow-md">
            Join Now
          </Link>
          <Link href="/team" className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:border-blue-300 hover:text-blue-600 transition-all">
            Meet the Team
          </Link>
        </div>
      </div>
    </div>
  );
}