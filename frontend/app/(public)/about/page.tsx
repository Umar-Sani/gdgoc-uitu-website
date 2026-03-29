'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BrutalistMemberCard, TeamMember } from '../../../components/ui/BrutalistMemberCard';

// ─── Types ────────────────────────────────────────────────────────────────────

type AboutSection = {
  section_id: number;
  section_key: string;
  title: string;
  body: string;
  display_order: number;
};

// Imported TeamMember from components

type Sponsor = {
  sponsor_id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string;
  description: string | null;
  display_order: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  platinum: { label: 'Platinum', color: 'bg-slate-100 border-slate-300 text-slate-700' },
  gold:     { label: 'Gold',     color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  silver:   { label: 'Silver',   color: 'bg-gray-50 border-gray-200 text-gray-600' },
  bronze:   { label: 'Bronze',   color: 'bg-orange-50 border-orange-200 text-orange-700' },
};

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <div className="h-1 w-12 flex mb-3 rounded-full overflow-hidden">
        <div className="flex-1 bg-[#4285F4]" />
        <div className="flex-1 bg-[#EA4335]" />
        <div className="flex-1 bg-[#FBBC05]" />
        <div className="flex-1 bg-[#34A853]" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AboutPage() {
  const [sections, setSections]   = useState<AboutSection[]>([]);
  const [members, setMembers]     = useState<TeamMember[]>([]);
  const [sponsors, setSponsors]   = useState<Sponsor[]>([]);
  const [loading, setLoading]     = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/cms/about`).then((r) => r.json()),
      fetch(`${API_URL}/api/cms/team`).then((r) => r.json()),
      fetch(`${API_URL}/api/cms/sponsors`).then((r) => r.json()),
    ])
      .then(([aboutRes, teamRes, sponsorsRes]) => {
        if (aboutRes.data) setSections(aboutRes.data);
        if (teamRes.data) setMembers(teamRes.data);
        if (sponsorsRes.data) setSponsors(sponsorsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ─── Group members by section ───────────────────────────────────────────────
  const gdgLead     = members.filter((m) => m.section === 'gdg_lead');
  const coLeads     = members.filter((m) => m.section === 'co_lead');
  const teamMembers = members.filter((m) => m.section === 'member');
  const mentors     = members.filter((m) => m.section === 'mentor');
  const pastLeaders = members.filter((m) => m.section === 'past_leader');

  // Get unique team names from co-leads
  const teamNames = [...new Set(coLeads.map((m) => m.team_name).filter(Boolean))] as string[];

  // Group members by team
  const membersByTeam = teamNames.reduce((acc, team) => {
    acc[team] = teamMembers
      .filter((m) => m.team_name === team)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    return acc;
  }, {} as Record<string, TeamMember[]>);

  // Group sponsors by tier
  const tiers = ['platinum', 'gold', 'silver', 'bronze'];
  const sponsorsByTier = tiers.reduce((acc, tier) => {
    acc[tier] = sponsors.filter((s) => s.tier === tier).sort((a, b) => a.display_order - b.display_order);
    return acc;
  }, {} as Record<string, Sponsor[]>);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
        <div className="h-1 w-full flex">
          <div className="flex-1 bg-[#4285F4]" />
          <div className="flex-1 bg-[#EA4335]" />
          <div className="flex-1 bg-[#FBBC05]" />
          <div className="flex-1 bg-[#34A853]" />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-4xl font-bold text-white tracking-tight">About GDGOC-UITU</h1>
          <p className="mt-4 text-blue-200 text-sm leading-relaxed max-w-xl mx-auto">
            Learn about our mission, the people behind the community, and the organizations that support us.
          </p>
          {/* Quick nav */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            {['#mission', '#team', '#sponsors'].map((anchor) => (
              <a
                key={anchor}
                href={anchor}
                className="px-4 py-2 rounded-xl bg-white bg-opacity-10 border border-white border-opacity-20 text-white text-xs font-semibold hover:bg-opacity-20 transition-all capitalize"
              >
                {anchor.replace('#', '')}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mission / About Sections ── */}
      <section id="mission" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Our Mission" subtitle="What we stand for and why we exist" />

          {loading ? (
            <div className="space-y-8 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : sections.length === 0 ? (
            <p className="text-gray-400 text-sm">Content coming soon.</p>
          ) : (
            <div className="space-y-10">
              {[...sections]
                .sort((a, b) => a.display_order - b.display_order)
                .map((section) => (
                  <div key={section.section_id} className="flex gap-6">
                    <div className="flex-shrink-0 w-1 rounded-full bg-gradient-to-b from-[#4285F4] via-[#FBBC05] to-[#34A853]" />
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{section.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{section.body}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Team ── */}
      <section id="team" className="py-24 bg-[#F4F4F0] border-t-[3px] border-black relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:40px_40px] opacity-60 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 font-sans">
          <SectionHeader title="Our Team" subtitle="The builders and organizers running the show." />

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-2xl border-[3px] border-black" />
              ))}
            </div>
          ) : (
            <div className="space-y-20">

              {/* GDG Lead */}
              {gdgLead.length > 0 && (
                <div>
                  <h3 className="text-sm font-black text-black uppercase tracking-widest mb-6 flex items-center gap-3 border-b-4 border-black pb-2 inline-flex">
                    <span className="w-6 h-6 rounded-full bg-[#EA4335] border-2 border-black flex items-center justify-center text-white text-xs shadow-[2px_2px_0_#000]">👑</span>
                    GDG Lead
                  </h3>
                  <div className="flex">
                    <div className="w-full md:w-1/2">
                      <BrutalistMemberCard member={gdgLead[0]} index={0} />
                    </div>
                  </div>
                </div>
              )}

              {/* Co-Leads and their Teams */}
              {teamNames.map((teamName, teamIdx) => {
                const coLead = coLeads.find((m) => m.team_name === teamName);
                const members = membersByTeam[teamName] ?? [];
                
                // We combine the co-lead and team members to map them uniformly
                const allTeamMembers = coLead ? [coLead, ...members] : members;

                return (
                  <div key={teamName}>
                    <h3 className="text-sm font-black text-black uppercase tracking-widest mb-6 flex items-center gap-3 border-b-4 border-black pb-2 inline-flex">
                      <span className="w-4 h-4 rounded-none bg-[#4285F4] border-2 border-black shadow-[2px_2px_0_#000]" />
                      {teamName}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14">
                      {allTeamMembers.map((member, idx) => (
                        <div key={member.member_id} className="relative h-full">
                          {member.role_title.toLowerCase().includes('lead') && (
                            <div className="absolute -top-4 -right-2 md:-right-4 z-30">
                              <span className="px-4 py-1 border-[3px] border-black text-xs font-black bg-[#FFED00] text-black uppercase shadow-[4px_4px_0_#000] rotate-3 block">
                                Lead
                              </span>
                            </div>
                          )}
                          <BrutalistMemberCard member={member} index={teamIdx + idx} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Mentors */}
              {mentors.length > 0 && (
                <div>
                  <h3 className="text-sm font-black text-black uppercase tracking-widest mb-6 flex items-center gap-3 border-b-4 border-black pb-2 inline-flex">
                    <span className="w-6 h-6 rounded-full bg-[#34A853] border-2 border-black flex items-center justify-center text-white text-xs shadow-[2px_2px_0_#000]">🎓</span>
                    Mentors
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14">
                    {[...mentors]
                      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                      .map((member, idx) => (
                        <BrutalistMemberCard key={member.member_id} member={member} index={idx + 1} />
                      ))}
                  </div>
                </div>
              )}

              {/* Past Leaders */}
              {pastLeaders.length > 0 && (
                <div>
                  <h3 className="text-sm font-black text-black uppercase tracking-widest mb-6 flex items-center gap-3 border-b-4 border-black pb-2 inline-flex">
                    <span className="w-6 h-6 rounded-full bg-[#FBBC05] border-2 border-black flex items-center justify-center text-white text-xs shadow-[2px_2px_0_#000]">⭐</span>
                    Past Leaders
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14">
                    {[...pastLeaders]
                      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                      .map((member, idx) => (
                        <div key={member.member_id} className="relative h-full">
                          {member.tenure_year && (
                            <div className="absolute -top-4 -right-2 md:-right-4 z-30">
                              <span className="px-3 py-1 border-[3px] border-black text-[10px] font-black bg-[#FBBC05] text-black uppercase shadow-[4px_4px_0_#000] rotate-2 block">
                                {member.tenure_year}
                              </span>
                            </div>
                          )}
                          <BrutalistMemberCard member={member} index={idx} />
                        </div>
                      ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </section>

      {/* ── Sponsors ── */}
      <section id="sponsors" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px x-4 sm:px-6 lg:px-8">
          <SectionHeader title="Our Sponsors" subtitle="Organizations that make GDGOC-UITU possible" />

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
              ))}
            </div>
          ) : sponsors.length === 0 ? (
            <p className="text-gray-400 text-sm">No sponsors to display yet.</p>
          ) : (
            <div className="space-y-12">
              {tiers.map((tier) => {
                const tierSponsors = sponsorsByTier[tier];
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
                          className="group flex flex-col items-center p-6 rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-md transition-all text-center"
                        >
                          {sponsor.logo_url ? (
                            <img
                              src={sponsor.logo_url}
                              alt={sponsor.name}
                              className="h-14 w-auto object-contain mb-3 grayscale group-hover:grayscale-0 transition-all"
                            />
                          ) : (
                            <div className="h-14 w-full rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                              <span className="text-lg font-bold text-gray-400">{sponsor.name[0]}</span>
                            </div>
                          )}
                          <p className="text-xs font-semibold text-gray-700">{sponsor.name}</p>
                          {sponsor.description && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{sponsor.description}</p>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Become a sponsor CTA */}
          <div className="mt-16 p-8 rounded-2xl bg-gray-50 border border-gray-100 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Become a Sponsor</h3>
            <p className="text-sm text-gray-500 mb-5 max-w-md mx-auto">
              Support student developers and get your brand in front of the next generation of tech talent at UIT University.
            </p>
            <Link
              href="/contact"
              className="px-6 py-3 rounded-xl bg-[#4285F4] text-white font-semibold text-sm hover:bg-blue-600 transition-all shadow-md"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}