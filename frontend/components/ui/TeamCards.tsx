'use client';

import { ReactNode } from 'react';
import { Antonio } from 'next/font/google';
import { TeamMember } from './BrutalistMemberCard';

const antonio = Antonio({ subsets: ['latin'] });

// Per-team theme: a vibrant gradient + matching glow, mirroring the WhoWeAre pills.
export type Theme = { solid: string; gradient: string; glow: string };
export const THEMES: Theme[] = [
  { solid: '#4285F4', gradient: 'linear-gradient(135deg, #5a9bff, #3474d4)', glow: 'rgba(66,133,244,0.55)' },  // Blue
  { solid: '#EA4335', gradient: 'linear-gradient(135deg, #ff7c70, #c53026)', glow: 'rgba(234,67,53,0.55)' },   // Red
  { solid: '#FBBC05', gradient: 'linear-gradient(135deg, #ffd34d, #e0a000)', glow: 'rgba(251,188,5,0.55)' },   // Yellow
  { solid: '#34A853', gradient: 'linear-gradient(135deg, #4cc36a, #288a44)', glow: 'rgba(52,168,83,0.55)' },   // Green
];

export type Team = {
  name: string;
  lead: TeamMember | null;
  /** All members of the team, lead first. */
  members: TeamMember[];
};

function initials(name: string): string {
  if (!name) return '??';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Member card ──────────────────────────────────────────────────────────────
export function MemberCard({
  member,
  theme,
  isLead = false,
}: {
  member: TeamMember;
  theme: Theme;
  isLead?: boolean;
}) {
  return (
    <div
      className="group flex flex-col rounded-3xl bg-white overflow-hidden hover:-translate-y-1.5 transition-all duration-300 ring-1 ring-white/10"
      style={{ boxShadow: `4px 4px 0 ${theme.solid}, 0 16px 40px -10px ${theme.glow}` }}
    >
      {/* Portrait */}
      <div className="relative aspect-[4/5] bg-gray-100 overflow-hidden">
        {member.avatar_url ? (
          <img
            src={member.avatar_url}
            alt={member.full_name}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
            draggable={false}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-6xl font-black text-white"
            style={{ backgroundImage: theme.gradient }}
          >
            {initials(member.full_name)}
          </div>
        )}
        {isLead && (
          <span
            className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white"
            style={{ backgroundImage: theme.gradient, boxShadow: `0 4px 14px ${theme.glow}` }}
          >
            Lead
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-grow p-5">
        <h4 className="text-xl font-black uppercase tracking-tight text-gray-900 leading-none">
          {member.full_name}
        </h4>
        <p
          className="text-sm font-black uppercase tracking-wide mt-2 px-3.5 py-1 self-start rounded-full text-white"
          style={{ backgroundImage: theme.gradient, boxShadow: `0 4px 14px ${theme.glow}` }}
        >
          {member.role_title}
        </p>
        {member.bio && (
          <p className="text-sm text-gray-700 font-medium leading-relaxed mt-3 line-clamp-4">{member.bio}</p>
        )}

        {(member.github_url || member.linkedin_url) && (
          <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-200 flex items-center gap-3">
            {member.linkedin_url && (
              <a
                href={member.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-9 h-9 rounded-full border-2 border-black bg-blue-100 text-black hover:bg-[#FFED00] hover:scale-110 active:scale-95 flex items-center justify-center transition-all"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            )}
            {member.github_url && (
              <a
                href={member.github_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="w-9 h-9 rounded-full border-2 border-black bg-gray-100 text-black hover:bg-[#FFED00] hover:scale-110 active:scale-95 flex items-center justify-center transition-all"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.509 11.509 0 013.006.404c2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576.604.115 12-4.393 12-12 0-6.627-5.373-12-12-12z"/></svg>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Single team block (sticky-left identity + cards-right) ───────────────────
function TeamBlock({ team, index }: { team: Team; index: number }) {
  const theme = THEMES[index % THEMES.length];
  const lead = team.lead;
  const count = team.members.length;
  // Reference-style title: "THE <name>" small over a big "TEAM".
  // Drop a trailing "Team" from the stored name so it doesn't read "THE MARKETING TEAM".
  const baseName = team.name.replace(/\s*teams?\s*$/i, '').trim() || team.name;

  return (
    <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-8 lg:gap-16">
      {/* LEFT — sticky identity panel, vertically centered within a full-height pinned
          column so it rides along with the cards without bleeding into the section above */}
      <div className="lg:sticky lg:top-0 lg:h-screen lg:flex lg:flex-col lg:justify-center lg:pr-6">
        <h3 className={`uppercase text-white ${antonio.className}`}>
          <span className="block font-black tracking-tight text-4xl sm:text-5xl xl:text-6xl">
            The {baseName}
          </span>
          <span
            className="block font-black tracking-tighter leading-[0.8] text-9xl sm:text-[9rem] lg:text-[9rem] xl:text-[12rem] 2xl:text-[15rem]"
            style={{ WebkitTextStroke: '2px rgba(255,255,255,0.25)' }}
          >
            Team
          </span>
        </h3>
        {lead && (
          <p className="mt-8 text-xl text-blue-200">
            Led by <span className="font-bold text-white">{lead.full_name}</span>
          </p>
        )}
        <p className="mt-1.5 text-base font-medium text-blue-200/60">
          {count} {count === 1 ? 'member' : 'members'}
        </p>
      </div>

      {/* RIGHT — member cards (always visible). Two large cards per row to fill the
          width with impact (like the reference), wrapping for larger teams. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
        {team.members.map((m) => (
          <MemberCard
            key={m.member_id}
            member={m}
            theme={theme}
            isLead={m.member_id === lead?.member_id}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Generic people block (sticky-left heading + cards-right) ─────────────────
// Same structure as a team block, but with custom left-hand copy and no team lead.
export function PeopleBlock({
  topLine,
  bigLine,
  subtitle,
  members,
  theme,
  badge,
}: {
  topLine: string;
  bigLine: string;
  subtitle?: string;
  members: TeamMember[];
  theme: Theme;
  /** Optional per-member overlay (e.g. tenure year). */
  badge?: (m: TeamMember) => ReactNode;
}) {
  if (members.length === 0) return null;
  const count = members.length;

  return (
    <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-8 lg:gap-16">
      {/* LEFT — sticky identity panel */}
      <div className="lg:sticky lg:top-0 lg:h-screen lg:flex lg:flex-col lg:justify-center lg:pr-6">
        <h3 className={`uppercase text-white ${antonio.className}`}>
          <span className="block font-black tracking-tight text-4xl sm:text-5xl xl:text-6xl">
            {topLine}
          </span>
          <span
            className="block font-black tracking-tighter leading-[0.8] text-8xl sm:text-9xl lg:text-[7rem] xl:text-[9rem] 2xl:text-[11rem]"
            style={{ WebkitTextStroke: '2px rgba(255,255,255,0.25)' }}
          >
            {bigLine}
          </span>
        </h3>
        {subtitle && <p className="mt-8 text-xl text-blue-200 max-w-md">{subtitle}</p>}
        <p className="mt-1.5 text-base font-medium text-blue-200/60">
          {count} {count === 1 ? 'person' : 'people'}
        </p>
      </div>

      {/* RIGHT — member cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
        {members.map((m) => (
          <div key={m.member_id} className="relative h-full">
            {badge?.(m)}
            <MemberCard member={m} theme={theme} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Showcase ─────────────────────────────────────────────────────────────────
export default function TeamCards({ teams }: { teams: Team[] }) {
  if (teams.length === 0) return null;

  return (
    <div className="space-y-20 lg:space-y-28">
      {teams.map((team, i) => (
        <TeamBlock key={team.name} team={team} index={i} />
      ))}
    </div>
  );
}
