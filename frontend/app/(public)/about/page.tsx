'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type AboutSection = {
  section_id: number;
  section_key: string;
  title: string;
  body: string;
  display_order: number;
};

type TeamMember = {
  member_id: string;
  full_name: string;
  role_title: string;
  bio: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  display_order: number;
  section: string;
  team_name: string | null;
  tenure_year: string | null;
  is_active: boolean;
};

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

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  platinum: { label: 'Platinum', color: 'bg-slate-100 border-slate-300 text-slate-700' },
  gold:     { label: 'Gold',     color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  silver:   { label: 'Silver',   color: 'bg-gray-50 border-gray-200 text-gray-600' },
  bronze:   { label: 'Bronze',   color: 'bg-orange-50 border-orange-200 text-orange-700' },
};

// ─── Member Card ──────────────────────────────────────────────────────────────

function MemberCard({ member, size = 'md' }: { member: TeamMember; size?: 'lg' | 'md' | 'sm' }) {
  const avatarSize = size === 'lg' ? 'w-24 h-24 text-2xl' : size === 'md' ? 'w-16 h-16 text-lg' : 'w-12 h-12 text-sm';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all p-5 text-center flex flex-col items-center">
      <div className={`${avatarSize} rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold overflow-hidden mb-3 flex-shrink-0`}>
        {member.avatar_url
          ? <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" />
          : getInitials(member.full_name)
        }
      </div>
      <p className="font-bold text-gray-900 text-sm">{member.full_name}</p>
      <p className="text-xs font-semibold text-[#4285F4] mt-0.5">{member.role_title}</p>
      {member.bio && (
        <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">{member.bio}</p>
      )}
      {(member.linkedin_url || member.github_url) && (
        <div className="flex items-center justify-center gap-2 mt-3">
          {member.linkedin_url && (
            <a
              href={member.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          )}
          {member.github_url && (
            <a
              href={member.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

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
      .sort((a, b) => a.display_order - b.display_order);
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
      <section id="team" className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Our Team" subtitle="The people who make GDGOC-UITU happen" />

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 animate-pulse">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-16">

              {/* GDG Lead */}
              {gdgLead.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#4285F4] flex items-center justify-center text-white text-xs">👑</span>
                    GDG Lead
                  </h3>
                  <div className="flex justify-center">
                    <div className="w-full max-w-xs">
                      <MemberCard member={gdgLead[0]} size="lg" />
                    </div>
                  </div>
                </div>
              )}

              {/* Co-Leads and their Teams */}
              {teamNames.map((teamName) => {
                const coLead = coLeads.find((m) => m.team_name === teamName);
                const members = membersByTeam[teamName] ?? [];
                return (
                  <div key={teamName}>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
                      {teamName}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                      {/* Co-lead first */}
                      {coLead && (
                        <div className="relative">
                          <div className="absolute -top-2 -right-2 z-10">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#4285F4] text-white">
                              Lead
                            </span>
                          </div>
                          <MemberCard member={coLead} size="md" />
                        </div>
                      )}
                      {/* Team members */}
                      {members.map((member) => (
                        <MemberCard key={member.member_id} member={member} size="md" />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Mentors */}
              {mentors.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#34A853] flex items-center justify-center text-white text-xs">🎓</span>
                    Mentors
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    {[...mentors]
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((member) => (
                        <MemberCard key={member.member_id} member={member} size="md" />
                      ))}
                  </div>
                </div>
              )}

              {/* Past Leaders */}
              {pastLeaders.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#FBBC05] flex items-center justify-center text-white text-xs">⭐</span>
                    Past Leaders
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    {[...pastLeaders]
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((member) => (
                        <div key={member.member_id} className="relative">
                          {member.tenure_year && (
                            <div className="absolute -top-2 -right-2 z-10">
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#FBBC05] text-gray-800">
                                {member.tenure_year}
                              </span>
                            </div>
                          )}
                          <MemberCard member={member} size="md" />
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