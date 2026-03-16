'use client';

import { useState, useEffect } from 'react';

type Sponsor = {
  sponsor_id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string;
  description: string | null;
  display_order: number;
};

const TIER_CONFIG: Record<string, { label: string; color: string; size: string }> = {
  platinum: { label: 'Platinum', color: 'bg-slate-100 border-slate-300 text-slate-700', size: 'h-20' },
  gold:     { label: 'Gold',     color: 'bg-yellow-50 border-yellow-200 text-yellow-700', size: 'h-16' },
  silver:   { label: 'Silver',   color: 'bg-gray-50 border-gray-200 text-gray-600', size: 'h-14' },
  bronze:   { label: 'Bronze',   color: 'bg-orange-50 border-orange-200 text-orange-700', size: 'h-12' },
};

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading]   = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    fetch(`${API_URL}/api/cms/sponsors`)
      .then((r) => r.json())
      .then((res) => { if (res.data) setSponsors(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const tiers = ['platinum', 'gold', 'silver', 'bronze'];
  const grouped = tiers.reduce((acc, tier) => {
    acc[tier] = sponsors.filter((s) => s.tier === tier).sort((a, b) => a.display_order - b.display_order);
    return acc;
  }, {} as Record<string, Sponsor[]>);

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
          <h1 className="text-4xl font-bold text-white tracking-tight">Our Sponsors</h1>
          <p className="mt-4 text-blue-200 text-sm leading-relaxed">
            Thank you to the organizations that make GDGOC-UITU possible.
          </p>
        </div>
      </div>

      {/* Sponsors by tier */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
            ))}
          </div>
        ) : sponsors.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-16">No sponsors to display yet.</p>
        ) : (
          tiers.map((tier) => {
            const tierSponsors = grouped[tier];
            if (!tierSponsors || tierSponsors.length === 0) return null;
            const config = TIER_CONFIG[tier];
            return (
              <div key={tier}>
                <div className="flex items-center gap-3 mb-6">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${config.color}`}>
                    {config.label}
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {tierSponsors.map((sponsor) => (
                    <a
                      key={sponsor.sponsor_id}
                      href={sponsor.website_url ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col items-center p-6 rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-md transition-all"
                    >
                      {sponsor.logo_url ? (
                        <img
                          src={sponsor.logo_url}
                          alt={sponsor.name}
                          className={`${config.size} w-auto object-contain mb-3 grayscale group-hover:grayscale-0 transition-all`}
                        />
                      ) : (
                        <div className={`${config.size} w-full rounded-xl bg-gray-100 flex items-center justify-center mb-3`}>
                          <span className="text-xs font-bold text-gray-400">{sponsor.name[0]}</span>
                        </div>
                      )}
                      <p className="text-xs font-semibold text-gray-700 text-center">{sponsor.name}</p>
                      {sponsor.description && (
                        <p className="text-xs text-gray-400 text-center mt-1 line-clamp-2">{sponsor.description}</p>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Become a sponsor CTA */}
      <div className="bg-gray-50 py-16 text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-3">Become a Sponsor</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          Support student developers and get your brand in front of the next generation of tech talent.
        </p>
        <a
          href="mailto:gdgoc@uitu.edu.pk"
          className="px-6 py-3 rounded-xl bg-[#4285F4] text-white font-semibold text-sm hover:bg-blue-600 transition-all shadow-md"
        >
          Get in Touch
        </a>
      </div>
    </div>
  );
}