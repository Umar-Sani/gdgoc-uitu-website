import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

// ─── Middleware factory ───────────────────────────────────────────────────────
// Validates req.body against a Zod schema. On failure returns 400 with the
// first human-readable error. On success, req.body is replaced with the
// parsed (and unknown-key-stripped) data.
export function validate(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? 'Invalid request body';
      return res.status(400).json({ data: null, error: message });
    }
    req.body = result.data;
    next();
  };
}

// ─── Reusable field helpers ───────────────────────────────────────────────────
const nullableUrl = z.url().nullish();

// ─── Forum ───────────────────────────────────────────────────────────────────
export const createThreadSchema = z.object({
  title:       z.string().min(3, 'Title must be at least 3 characters').max(200),
  body:        z.string().min(10, 'Body must be at least 10 characters').max(10_000),
  category_id: z.coerce.number().int().positive({ message: 'Invalid category' }),
  tags:        z.array(z.string().max(50)).max(5).optional(),
});

export const createReplySchema = z.object({
  body:            z.string().min(1, 'Reply cannot be empty').max(5_000),
  parent_reply_id: z.uuid().nullish(),
});

// ─── Users: profile ───────────────────────────────────────────────────────────
export const updateProfileSchema = z.object({
  full_name:  z.string().min(1).max(100).optional(),
  username:   z.string().min(3).max(30)
                .regex(/^[a-z0-9_]+$/, 'Username may only contain lowercase letters, numbers, and underscores')
                .optional(),
  bio:        z.string().max(500).nullish(),
  skill_tags: z.array(z.string().max(50)).max(10).optional(),
  avatar_url: nullableUrl,
});

// ─── Users: notification preferences ─────────────────────────────────────────
export const updatePreferencesSchema = z.object({
  email_enabled: z.boolean().optional(),
  inapp:         z.record(z.string(), z.boolean()).optional(),
  email:         z.record(z.string(), z.boolean()).optional(),
});

// ─── Admin ───────────────────────────────────────────────────────────────────
export const updateRoleSchema = z.object({
  role_name: z.enum(['user', 'editor', 'admin', 'super_admin']),
});

export const updateStatusSchema = z.object({
  is_active: z.boolean(),
});

// ─── CMS: public endpoints ────────────────────────────────────────────────────
export const contactSchema = z.object({
  full_name: z.string().min(1).max(100),
  email:     z.email({ error: 'Enter a valid email address' }).max(200),
  subject:   z.string().max(200).optional(),
  message:   z.string().min(10, 'Message must be at least 10 characters').max(2_000),
});

export const newsletterSchema = z.object({
  email: z.email({ error: 'Enter a valid email address' }).max(200),
  name:  z.string().max(100).optional(),
});

// ─── CMS: homepage ───────────────────────────────────────────────────────────
export const updateHomepageSchema = z.object({
  hero_title:     z.string().max(200).nullish(),
  hero_subtitle:  z.string().max(500).nullish(),
  hero_cta_text:  z.string().max(100).nullish(),
  hero_cta_url:   z.string().max(500).nullish(),
  stats_members:  z.number().int().nullish(),
  stats_events:   z.number().int().nullish(),
  stats_projects: z.number().int().nullish(),
  announcement:   z.string().max(500).nullish(),
});

export const updateAboutSchema = z.object({
  title: z.string().max(200).optional(),
  body:  z.string().max(5_000).optional(),
});

// ─── CMS: team members ────────────────────────────────────────────────────────
const TEAM_SECTIONS = ['gdg_lead', 'co_lead', 'member', 'mentor', 'past_leader'] as const;

export const createTeamMemberSchema = z.object({
  full_name:     z.string().min(1).max(100),
  role_title:    z.string().min(1).max(100),
  bio:           z.string().max(500).nullish(),
  avatar_url:    nullableUrl,
  linkedin_url:  nullableUrl,
  github_url:    nullableUrl,
  display_order: z.number().int().optional(),
  is_active:     z.boolean().optional(),
  section:       z.enum(TEAM_SECTIONS).optional(),
  team_name:     z.string().max(100).nullish(),
  tenure_year:   z.string().max(20).nullish(),
});
export const updateTeamMemberSchema = createTeamMemberSchema.partial();

// ─── CMS: teams ───────────────────────────────────────────────────────────────
export const createTeamSchema = z.object({
  name:          z.string().min(1).max(100),
  display_order: z.number().int().optional(),
});
export const updateTeamSchema = createTeamSchema.partial();

// ─── CMS: sponsors ────────────────────────────────────────────────────────────
export const createSponsorSchema = z.object({
  name:          z.string().min(1).max(100),
  logo_url:      nullableUrl,
  website_url:   nullableUrl,
  tier:          z.enum(['platinum', 'gold', 'silver', 'bronze']).optional(),
  description:   z.string().max(500).nullish(),
  display_order: z.number().int().optional(),
});
export const updateSponsorSchema = createSponsorSchema.partial().extend({
  is_active: z.boolean().optional(),
});

// ─── CMS: featured events ─────────────────────────────────────────────────────
export const createFeaturedEventSchema = z.object({
  event_id:      z.uuid().nullish(),
  title:         z.string().min(1).max(200),
  description:   z.string().max(1_000).nullish(),
  image_url:     nullableUrl,
  event_date:    z.string().nullish(),
  category:      z.string().max(100).nullish(),
  display_order: z.number().int().optional(),
});
export const updateFeaturedEventSchema = createFeaturedEventSchema.partial().extend({
  is_active: z.boolean().optional(),
});

// ─── CMS: testimonials ───────────────────────────────────────────────────────
export const createTestimonialSchema = z.object({
  author_name: z.string().min(1).max(100),
  author_role: z.string().max(100).nullish(),
  quote:       z.string().min(20, 'Quote must be at least 20 characters').max(1_000),
});
export const updateTestimonialSchema = z.object({
  author_name:   z.string().max(100).nullish(),
  author_role:   z.string().max(100).nullish(),
  quote:         z.string().min(1).max(1_000).nullish(),
  is_approved:   z.boolean().optional(),
  display_order: z.number().int().nullish(),
});

// ─── Events ───────────────────────────────────────────────────────────────────
const EVENT_TYPES    = ['workshop', 'seminar', 'hackathon', 'session', 'social'] as const;
const EVENT_STATUSES = ['draft', 'published', 'ongoing', 'completed', 'cancelled'] as const;

export const createEventSchema = z.object({
  title:          z.string().min(3).max(200),
  description:    z.string().max(5_000).nullish(),
  event_type:     z.enum(EVENT_TYPES),
  category_id:    z.coerce.number().int().positive({ message: 'Invalid category' }),
  start_datetime: z.string().min(1, 'Start date/time is required'),
  end_datetime:   z.string().min(1, 'End date/time is required'),
  venue:          z.string().max(200).nullish(),
  max_seats:      z.number().int().min(1).max(10_000),
  is_free:        z.boolean().optional(),
  ticket_price:   z.number().min(0).nullish(),
  tags:           z.array(z.string().max(50)).max(10).optional(),
  status:         z.enum(EVENT_STATUSES).optional(),
  banner_url:     nullableUrl,
});
export const updateEventSchema = createEventSchema.partial();

// ─── Social posts ─────────────────────────────────────────────────────────────
const PLATFORMS     = ['instagram', 'twitter', 'linkedin', 'facebook'] as const;
const POST_STATUSES = ['draft', 'scheduled', 'published', 'archived'] as const;

export const createSocialPostSchema = z.object({
  platform:     z.enum(PLATFORMS),
  caption:      z.string().min(1).max(2_200),
  media_urls:   z.array(z.url()).max(10).optional(),
  tags:         z.array(z.string().max(50)).max(20).optional(),
  hashtags:     z.array(z.string().max(50)).max(20).optional(),
  scheduled_at: z.string().nullish(),
});
export const updateSocialPostSchema = createSocialPostSchema.partial().extend({
  status: z.enum(POST_STATUSES).optional(),
});

// ─── Payments ─────────────────────────────────────────────────────────────────
export const createCheckoutSchema = z.object({
  event_id: z.uuid({ error: 'Invalid event ID' }),
});
