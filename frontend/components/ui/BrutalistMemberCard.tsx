import Link from 'next/link';
import { ReactNode } from 'react';

// Shared type for member to ensure compatibility
export type TeamMember = {
  member_id: string;
  full_name: string;
  role_title: string;
  bio: string | null;
  avatar_url: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  display_order?: number;
  section?: string;
  team_name?: string | null;
  tenure_year?: string | null;
  is_active?: boolean;
};

// Helper for initials
function getInitials(name: string): string {
  if (!name) return '??';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

interface BrutalistMemberCardProps {
  member: TeamMember;
  index: number;
  actionHref?: string;
  actionLabel?: string;
}

export function BrutalistMemberCard({ member, index, actionHref, actionLabel = 'VIEW PROFILE' }: BrutalistMemberCardProps) {
  // Google Official Colors mapping
  const googleThemes = [
    { bg: 'bg-[#EA4335]', sticker: '#FBBC05', isLeft: true },  // Red
    { bg: 'bg-[#4285F4]', sticker: '#34A853', isLeft: false }, // Blue
    { bg: 'bg-[#FBBC05]', sticker: '#EA4335', isLeft: true },  // Yellow
    { bg: 'bg-[#34A853]', sticker: '#4285F4', isLeft: false }  // Green
  ];

  const theme = googleThemes[index % googleThemes.length];
  const bgColor = theme.bg;
  const stickerColor = theme.sticker;
  
  return (
    <div className={`group ${bgColor} rounded-2xl border-[3px] border-black shadow-[10px_10px_0_#000] p-5 flex flex-col relative transition-transform hover:-translate-y-2 hover:shadow-[14px_14px_0_#000] duration-300 h-full`}>
      
      {/* Image Container with Custom SVG Sticker */}
      <div className="w-full aspect-square sm:aspect-video lg:aspect-[4/3] rounded-xl border-[3px] border-black overflow-hidden bg-white mb-6 relative flex-shrink-0">
        {member.avatar_url ? (
          <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
             <span className="text-4xl sm:text-5xl font-black text-gray-400">{getInitials(member.full_name)}</span>
          </div>
        )}

        {/* Brutalist Star Sticker positioned randomly based on theme */}
        <div className={`absolute ${theme.isLeft ? '-left-6 top-[40%]' : '-right-6 top-[30%]'} -translate-y-1/2 w-16 h-16 md:w-24 md:h-24 z-20 hover:scale-110 transition-transform hidden sm:block`}>
           <svg viewBox="0 0 100 100" fill={stickerColor} className="w-full h-full drop-shadow-[3px_3px_0_rgba(0,0,0,1)]">
             <path stroke="#000" strokeWidth="3" strokeLinejoin="round" d="M50 2 L58 20 L78 12 L72 32 L92 38 L72 52 L82 72 L60 62 L50 82 L40 62 L18 72 L28 52 L8 38 L28 32 L22 12 L42 20 Z"/>
           </svg>
        </div>
      </div>

      {/* Text Content */}
      <div className="flex flex-col flex-grow px-1 sm:px-2 mt-2">
        <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase text-white tracking-tight leading-[0.9] mb-2 drop-shadow-[2px_2px_0_rgba(0,0,0,1)]" style={{ WebkitTextStroke: '2px black' }}>
          {member.full_name}
        </h3>
        <p className="text-white font-bold text-base sm:text-lg md:text-xl uppercase tracking-tighter mb-4" style={{ WebkitTextStroke: '1px black' }}>
          {member.role_title}
        </p>
        
        <p className="text-white text-sm sm:text-base md:text-lg font-medium leading-relaxed mb-6 sm:mb-8 flex-grow drop-shadow-[1px_1px_1px_rgba(0,0,0,0.8)]">
          {member.bio || "Building the GDGOC-UITU community through epic tech events and relentless coding sessions."}
        </p>

        {/* Brutalist Action Area */}
        <div className="mt-auto flex flex-col sm:flex-row gap-3">
          {actionHref ? (
            <Link href={actionHref} className="inline-flex w-full items-center justify-center gap-3 bg-white border-[3px] border-black rounded-full px-5 py-3 shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-1 active:shadow-none active:translate-y-1 transition-all group/btn">
              <span className="font-black uppercase tracking-wider text-black text-xs sm:text-sm">
                {actionLabel}
              </span>
              <span className="bg-[#FFED00] border-2 border-black px-2 sm:px-3 py-0.5 text-[10px] font-black uppercase rounded-full group-hover/btn:bg-[#EA4335] group-hover/btn:text-white transition-colors">
                {(member.role_title || '').toLowerCase().includes('lead') ? 'LEAD' : 'MEMBER'}
              </span>
            </Link>
          ) : (
            /* Socials Block */
            <div className="w-full flex justify-end gap-3 items-center bg-white border-[3px] border-black rounded-full px-4 py-2 shadow-[4px_4px_0_#000]">
               <span className="font-black text-black px-2 text-xs sm:text-sm uppercase tracking-wider border-r-2 border-black">CONNECT</span>
               <div className="flex gap-2">
                  {member.github_url && (
                    <a href={member.github_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full border-2 border-black bg-gray-100 flex items-center justify-center hover:bg-[#FFED00] hover:scale-110 active:scale-95 transition-all text-black">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.509 11.509 0 013.006.404c2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576.604.115 12-4.393 12-12 0-6.627-5.373-12-12-12z"/></svg>
                    </a>
                  )}
                  {member.linkedin_url && (
                    <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full border-2 border-black bg-blue-100 flex items-center justify-center hover:bg-[#FFED00] hover:scale-110 active:scale-95 transition-all text-black">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    </a>
                  )}
                  {!member.github_url && !member.linkedin_url && (
                    <span className="text-xs font-bold text-gray-500 uppercase">None</span>
                  )}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
