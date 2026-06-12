'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TeamMember } from '../../../components/ui/BrutalistMemberCard';
import TeamCards, { Team, MemberCard, PeopleBlock, THEMES } from '../../../components/ui/TeamCards';
import ParallaxBackdrop from '../../../components/ui/ParallaxBackdrop';
import CactusRunner from '../../../components/ui/CactusRunner';
import MissionScroll from '../../../components/ui/MissionScroll';
import { Antonio } from 'next/font/google';

const antonio = Antonio({ subsets: ['latin'] });

// ─── Types ────────────────────────────────────────────────────────────────────

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

function SectionHeader({ title, subtitle, light = false }: { title: string; subtitle?: string; light?: boolean }) {
  return (
    <div className="mb-8">
      <div className="h-1 w-12 flex mb-3 rounded-full overflow-hidden">
        <div className="flex-1 bg-[#4285F4]" />
        <div className="flex-1 bg-[#EA4335]" />
        <div className="flex-1 bg-[#FBBC05]" />
        <div className="flex-1 bg-[#34A853]" />
      </div>
      <h2 className={`text-2xl font-bold tracking-tight ${light ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
      {subtitle && <p className={`text-sm mt-1 ${light ? 'text-blue-200' : 'text-gray-500'}`}>{subtitle}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AboutPage() {
  const [members, setMembers]     = useState<TeamMember[]>([]);
  const [teams, setTeams]         = useState<{ team_id: string; name: string; display_order: number }[]>([]);
  const [sponsors, setSponsors]   = useState<Sponsor[]>([]);
  const [loading, setLoading]     = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/cms/team`).then((r) => r.json()),
      fetch(`${API_URL}/api/cms/teams`).then((r) => r.json()),
      fetch(`${API_URL}/api/cms/sponsors`).then((r) => r.json()),
    ])
      .then(([teamRes, teamsRes, sponsorsRes]) => {
        if (teamRes.data) setMembers(teamRes.data);
        if (teamsRes.data) setTeams(teamsRes.data);
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

  // Teams ordered by the teams-table display_order; only those with a co-lead are shown.
  // Any team a co-lead uses that isn't in the teams table (legacy) is appended at the end.
  const usedTeams = new Set(coLeads.map((m) => m.team_name).filter(Boolean) as string[]);
  const orderedFromTable = teams.map((t) => t.name).filter((n) => usedTeams.has(n));
  const leftovers = [...usedTeams].filter((n) => !teams.some((t) => t.name === n));
  const teamNames = [...orderedFromTable, ...leftovers];

  // Group members by team
  const membersByTeam = teamNames.reduce((acc, team) => {
    acc[team] = teamMembers
      .filter((m) => m.team_name === team)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    return acc;
  }, {} as Record<string, TeamMember[]>);

  // Shape each team for the showcase: lead first, then its members.
  const teamData: Team[] = teamNames.map((teamName) => {
    const lead = coLeads.find((m) => m.team_name === teamName) ?? null;
    const rest = membersByTeam[teamName] ?? [];
    return { name: teamName, lead, members: lead ? [lead, ...rest] : rest };
  });

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
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative pt-28 md:pt-32 pb-12 md:pb-16 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 flex">
          <div className="flex-1 bg-[#4285F4]" />
          <div className="flex-1 bg-[#EA4335]" />
          <div className="flex-1 bg-[#FBBC05]" />
          <div className="flex-1 bg-[#34A853]" />
        </div>
        <CactusRunner />
        <div className="relative z-[10] w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className={`text-5xl sm:text-7xl md:text-8xl font-black text-white uppercase tracking-tighter ${antonio.className}`}>
            About GDGOC-UITU
          </h1>
          <p className="mt-4 text-blue-200 font-medium text-sm sm:text-base leading-relaxed max-w-md">
            Learn about our mission, the people behind the community, and the organizations that support us.
          </p>
          {/* Quick nav buttons */}
          <div className="flex flex-wrap items-center gap-4 mt-8">
            {['#mission', '#team', '#sponsors'].map((anchor) => (
              <a
                key={anchor}
                href={anchor}
                className="inline-block px-6 py-3 bg-white/5 border-2 border-white/20 text-white text-xs sm:text-sm font-black uppercase tracking-widest shadow-[4px_4px_0_rgba(255,255,255,0.1)] hover:bg-white/10 hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_0px_0_rgba(255,255,255,0.1)] transition-all"
              >
                {anchor.replace('#', '')}
              </a>
            ))}
          </div>
        </div>

        {/* Decorative mascot — pinned to bottom-right, feet touch the section edge */}
        <div className="hidden md:block absolute bottom-0 right-8 lg:right-16 w-52 lg:w-72 z-[20] pointer-events-none">
          <img
            src="/images/Android_Mascot_About_Me.png"
            alt=""
            className="w-full h-auto object-contain drop-shadow-[0_20px_40px_rgba(66,133,244,0.25)]"
            draggable={false}
          />
        </div>
      </div>

      {/* ── Mission / About Sections ── */}
      {/* ── Our Mission / Vision / What We Do — pinned scroll section ── */}
      <MissionScroll />

      {/* ── Team ── */}
      <section id="team" className="py-24 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-x-clip">
        {/* Decorative mascot backdrop — full width, drifts slowly down the section (parallax) */}
        <ParallaxBackdrop
          src="/images/Android_Mascots_Classroom.png"
          className="opacity-[0.08] z-0"
        />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 font-sans">
          {/* Centered, oversized header to match the Mission / hero sections */}
          <div className="text-center mb-16">
            <div className="h-1.5 w-16 mx-auto flex mb-6 rounded-full overflow-hidden">
              <div className="flex-1 bg-[#4285F4]" />
              <div className="flex-1 bg-[#EA4335]" />
              <div className="flex-1 bg-[#FBBC05]" />
              <div className="flex-1 bg-[#34A853]" />
            </div>
            <h2 className={`text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter text-white leading-[0.9] ${antonio.className}`}>
              Our Team
            </h2>
            <p className="mt-5 text-base md:text-lg text-blue-200 max-w-xl mx-auto">
              The builders and organizers running the show.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-2xl border-[3px] border-black" />
              ))}
            </div>
          ) : (
            <div className="space-y-20">

              {/* GDG Lead — centered card flanked by "GDG / LEAD" and a phrase */}
              {gdgLead.length > 0 && (
                <div className="relative left-1/2 -translate-x-1/2 w-screen max-w-[1600px] px-4 sm:px-8 lg:px-12">
                  <div className="grid lg:grid-cols-[1fr_minmax(0,21rem)_1fr] gap-10 lg:gap-12 items-center">
                    {/* Left — GDG / LEAD */}
                    <h3 className={`uppercase text-white text-center lg:text-right ${antonio.className}`}>
                      <span className="block font-black tracking-tight text-4xl sm:text-5xl xl:text-6xl">
                        GDG
                      </span>
                      <span
                        className="block font-black tracking-tighter leading-[0.8] text-8xl sm:text-9xl xl:text-[11rem]"
                        style={{ WebkitTextStroke: '2px rgba(255,255,255,0.25)' }}
                      >
                        Lead
                      </span>
                    </h3>

                    {/* Middle — the card */}
                    <MemberCard member={gdgLead[0]} theme={THEMES[0]} isLead />

                    {/* Right — phrase about the leaders */}
                    <p className="text-lg md:text-xl text-blue-100 leading-relaxed max-w-sm mx-auto lg:mx-0 text-center lg:text-left">
                      Behind every GDGOC-UITU milestone is a leader who turns ideas into action —
                      guiding the community, championing collaboration, and empowering the next
                      generation of builders.
                    </p>
                  </div>
                </div>
              )}

              {/* Teams — sticky-left identity + cards-right. Breaks out wider than the
                  page column so the cards fill the screen instead of leaving dead space. */}
              {teamData.length > 0 && (
                <div className="relative left-1/2 -translate-x-1/2 w-screen max-w-[1600px] px-4 sm:px-8 lg:px-12">
                  <TeamCards teams={teamData} />
                </div>
              )}

              {/* Mentors — same sticky-left / cards-right structure as Teams */}
              {mentors.length > 0 && (
                <div className="relative left-1/2 -translate-x-1/2 w-screen max-w-[1600px] px-4 sm:px-8 lg:px-12">
                  <PeopleBlock
                    topLine="Our"
                    bigLine="Mentors"
                    subtitle="The experienced guides shaping the community."
                    members={[...mentors].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))}
                    theme={THEMES[3]}
                  />
                </div>
              )}

              {/* Past Leaders — same structure, with the tenure-year sticker */}
              {pastLeaders.length > 0 && (
                <div className="relative left-1/2 -translate-x-1/2 w-screen max-w-[1600px] px-4 sm:px-8 lg:px-12">
                  <PeopleBlock
                    topLine="Past"
                    bigLine="Leaders"
                    subtitle="The alumni who built the foundation."
                    members={[...pastLeaders].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))}
                    theme={THEMES[1]}
                  />
                </div>
              )}

            </div>
          )}
        </div>
      </section>

      {/* ── Sponsors ── */}
      <section id="sponsors" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Centered, oversized header to match the Mission / Team sections */}
          <div className="text-center mb-16">
            <div className="h-1.5 w-16 mx-auto flex mb-6 rounded-full overflow-hidden">
              <div className="flex-1 bg-[#4285F4]" />
              <div className="flex-1 bg-[#EA4335]" />
              <div className="flex-1 bg-[#FBBC05]" />
              <div className="flex-1 bg-[#34A853]" />
            </div>
            <h2 className={`text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter text-slate-900 leading-[0.9] ${antonio.className}`}>
              Our Sponsors
            </h2>
            <p className="mt-5 text-base md:text-lg text-gray-500 max-w-xl mx-auto">
              Organizations that make GDGOC-UITU possible.
            </p>
          </div>

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                      {tierSponsors.map((sponsor) => (
                        <a
                          key={sponsor.sponsor_id}
                          href={sponsor.website_url ?? '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex flex-col items-center p-10 rounded-3xl border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg hover:-translate-y-1 transition-all text-center"
                        >
                          {sponsor.logo_url ? (
                            <img
                              src={sponsor.logo_url}
                              alt={sponsor.name}
                              className="h-32 w-auto object-contain mb-5 grayscale group-hover:grayscale-0 transition-all"
                            />
                          ) : (
                            <div className="h-32 w-full rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
                              <span className="text-4xl font-bold text-gray-400">{sponsor.name[0]}</span>
                            </div>
                          )}
                          <p className="text-lg font-bold text-gray-800">{sponsor.name}</p>
                          {sponsor.description && (
                            <p className="text-sm text-gray-400 mt-2 line-clamp-3">{sponsor.description}</p>
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