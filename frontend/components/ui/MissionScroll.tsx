'use client';

import { Antonio } from 'next/font/google';

const antonio = Antonio({ subsets: ['latin'] });

type Panel = { title: string; body: string };

// Static copy — just a few lines, no need to fetch from the CMS.
const PANELS: Panel[] = [
  {
    title: 'Our Mission',
    body: 'GDGOC-UITU is a student-led community at UIT University Karachi, empowering students to learn and grow through technology.',
  },
  {
    title: 'Our Vision',
    body: 'To build a thriving tech community where every student has the opportunity to develop skills, collaborate on projects, and connect with industry professionals.',
  },
  {
    title: 'What We Do',
    body: 'We organize workshops, hackathons, study jams, and networking events focused on Google technologies and beyond.',
  },
];

const IMG = '/images/OUR%20MISSION%20IMAGES/';

type Slot = { src: string; side: 'left' | 'right'; w: string };

// All 10 GDGOC event photos, alternating sides per panel (left, right, left, …).
// Heights are auto so each photo keeps its original aspect ratio (no cropping).
const PANEL_IMAGES: Slot[][] = [
  // ── Our Mission ──
  [
    { src: IMG + 'GDGOC%20TEAM.jpeg',           side: 'left',  w: 'w-60 lg:w-80 xl:w-[30rem]' },
    { src: IMG + 'CTF%20EVENT.jpeg',            side: 'right', w: 'w-56 lg:w-72 xl:w-[26rem]' },
    { src: IMG + 'BIRTHDAY%20CELEBRATION.jpeg', side: 'left',  w: 'w-52 lg:w-64 xl:w-96'      },
  ],
  // ── Our Vision ──
  [
    { src: IMG + 'KHINEXT%20EVENT%20TEAM.jpeg',  side: 'left',  w: 'w-60 lg:w-80 xl:w-[30rem]' },
    { src: IMG + 'OLYMTECH%20VOLUNTEERING.jpeg', side: 'right', w: 'w-56 lg:w-72 xl:w-[26rem]' },
    { src: IMG + 'OLYMTECH%20SELFIE.jpeg',       side: 'left',  w: 'w-52 lg:w-64 xl:w-96'      },
  ],
  // ── What We Do ──
  [
    { src: IMG + 'MOU%20WITH%20FAST.jpeg',                side: 'left',  w: 'w-56 lg:w-72 xl:w-[26rem]' },
    { src: IMG + 'NASTAP%20GDG%20KOLACHI%20DEVFEST.jpeg', side: 'right', w: 'w-60 lg:w-80 xl:w-[30rem]' },
    { src: IMG + 'KHINEXT%20SNAP.jpeg',                   side: 'left',  w: 'w-52 lg:w-64 xl:w-96'      },
    { src: IMG + 'CTF%20Event%20Snap.jpg',                side: 'right', w: 'w-52 lg:w-64 xl:w-96'      },
  ],
];

const COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];

// Vertical gap (in viewport heights) between consecutive images — large enough that
// only one image is in frame at a time; the next enters as the current is leaving.
const STEP = 80;

export default function MissionScroll() {
  return (
    <section id="mission" className="relative bg-white overflow-x-clip">
      {PANELS.map((panel, i) => {
        const slots = PANEL_IMAGES[i % PANEL_IMAGES.length];
        // First viewport shows the text alone; each image then occupies ~one screen.
        const blockH = (slots.length + 2) * STEP;
        return (
          <div key={i} className="relative" style={{ minHeight: `${blockH}vh` }}>

            {/* ── Pinned centre text (alone at the top of the section) ── */}
            <div className="sticky top-0 h-screen flex items-center justify-center px-6">
              <div className="relative z-20 text-center max-w-3xl bg-white/70 backdrop-blur-md rounded-3xl px-8 py-10">
                <div className="h-1.5 w-16 mx-auto flex mb-6 rounded-full overflow-hidden">
                  {COLORS.map((c) => (
                    <div key={c} className="flex-1" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <p className="font-mono text-xs text-gray-400 uppercase tracking-[0.25em] mb-4">
                  {String(i + 1).padStart(2, '0')} — GDGOC&nbsp;UITU
                </p>
                <h2 className={`text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter text-slate-900 leading-[0.9] ${antonio.className}`}>
                  {panel.title}
                </h2>
                <p className="mt-6 text-base md:text-lg text-gray-600 leading-relaxed whitespace-pre-line">
                  {panel.body}
                </p>
              </div>
            </div>

            {/* ── Static side images — one passes through the frame at a time ── */}
            {slots.map((s, j) => (
              <img
                key={j}
                src={s.src}
                alt=""
                sizes="(min-width: 1280px) 320px, (min-width: 1024px) 256px, 208px"
                style={{ top: `${(j + 1) * STEP}vh` }}
                className={`hidden md:block absolute z-10 ${
                  s.side === 'left' ? 'left-[3%] lg:left-[5%]' : 'right-[3%] lg:right-[5%]'
                } ${s.w} h-auto rounded-2xl shadow-2xl border-[3px] border-white`}
                draggable={false}
              />
            ))}
          </div>
        );
      })}
    </section>
  );
}
