'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type ActivityType = 'registration' | 'thread' | 'reply' | 'upvote';

export type ActivityItem = {
  type: ActivityType;
  created_at: string;
};

type ActivityChartProps = {
  activities: ActivityItem[];
};

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const TYPE_META: Record<ActivityType, { label: string; color: string }> = {
  registration: { label: 'registrations', color: 'bg-[#4285F4]' },
  thread:       { label: 'threads',       color: 'bg-[#34A853]' },
  reply:        { label: 'replies',       color: 'bg-[#FBBC05]' },
  upvote:       { label: 'upvotes',       color: 'bg-[#EA4335]' },
};

// Returns midnight (local) for a date n days ago from today.
function dayStart(daysAgo: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

export default function ActivityChart({ activities }: ActivityChartProps) {
  // Build last-7-days buckets, oldest → today.
  const days = Array.from({ length: 7 }, (_, i) => {
    const start = dayStart(6 - i);
    return {
      start,
      end: dayStart(5 - i), // exclusive upper bound (next day's midnight)
      label: DAY_LABELS[start.getDay()],
      isToday: i === 6,
      count: 0,
    };
  });

  const weekAgoStart = dayStart(6).getTime();
  const twoWeeksAgoStart = dayStart(13).getTime();
  let thisWeekCount = 0;
  let lastWeekCount = 0;

  const typeCounts: Record<ActivityType, number> = {
    registration: 0, thread: 0, reply: 0, upvote: 0,
  };

  for (const item of activities) {
    const t = new Date(item.created_at).getTime();
    if (Number.isNaN(t)) continue;

    if (t >= weekAgoStart) {
      thisWeekCount++;
      if (item.type in typeCounts) typeCounts[item.type]++;
      for (const day of days) {
        if (t >= day.start.getTime() && t < day.end.getTime()) {
          day.count++;
          break;
        }
      }
    } else if (t >= twoWeeksAgoStart) {
      lastWeekCount++;
    }
  }

  const maxCount = Math.max(...days.map(d => d.count), 1);
  const delta = thisWeekCount - lastWeekCount;

  let percentLabel: string;
  if (lastWeekCount === 0) {
    percentLabel = thisWeekCount === 0 ? 'No activity yet' : `${thisWeekCount} this week`;
  } else {
    const pct = Math.round((delta / lastWeekCount) * 100);
    percentLabel =
      pct === 0 ? 'Same as last week'
      : pct > 0 ? `${pct}% more than last week`
      : `${Math.abs(pct)}% fewer than last week`;
  }

  const trendUp = delta > 0;
  const trendDown = delta < 0;
  const TrendIcon = trendUp ? TrendingUp : trendDown ? TrendingDown : Minus;
  const trendColor = trendUp
    ? 'text-[#34A853] bg-green-50'
    : trendDown
      ? 'text-[#EA4335] bg-red-50'
      : 'text-gray-500 bg-gray-100';

  // Build a "3 registrations · 2 replies" style breakdown of the active types.
  const breakdown = (Object.keys(typeCounts) as ActivityType[])
    .filter(type => typeCounts[type] > 0)
    .map(type => `${typeCounts[type]} ${TYPE_META[type].label}`)
    .join(' · ');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-bold text-gray-900">Your Activity</h2>
        <span className="text-xs text-gray-400">Last 7 days</span>
      </div>
      <p className="text-xs text-gray-500 mb-6">
        Registrations, posts, replies &amp; upvotes over the past week
      </p>

      <div className="flex items-end justify-between gap-4">
        {/* Stat callout */}
        <div className="flex-shrink-0">
          <p className="text-3xl font-bold text-gray-900 leading-none">{thisWeekCount}</p>
          <p className="text-xs text-gray-400 mt-1">actions this week</p>
          <span className={`inline-flex items-center gap-1 mt-3 text-xs font-semibold px-2 py-1 rounded-full ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            {percentLabel}
          </span>
        </div>

        {/* Bars */}
        <div className="flex-1 flex items-end justify-between gap-2 h-28 max-w-xs">
          {days.map((day, i) => {
            const pct = (day.count / maxCount) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-md transition-all duration-300 ${day.isToday ? 'bg-[#4285F4]' : 'bg-blue-100'}`}
                    style={{ height: `${Math.max(pct, 4)}%` }}
                    title={`${day.count} action${day.count === 1 ? '' : 's'}`}
                  />
                </div>
                <span className={`text-[10px] font-medium ${day.isToday ? 'text-[#4285F4]' : 'text-gray-400'}`}>
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Type breakdown */}
      {breakdown && (
        <p className="text-[11px] text-gray-400 mt-5 pt-4 border-t border-gray-50">{breakdown}</p>
      )}
    </div>
  );
}
