// ── Users ─────────────────────────────────────────────────────
export type RoleName = 'super_admin' | 'admin' | 'editor' | 'viewer' | 'user'

export type User = {
  user_id: string
  email: string
  full_name: string
  username: string | null
  role_name: RoleName
  avatar_url: string | null
  bio: string | null
  skill_tags: string[]
  is_verified: boolean
  is_active: boolean
  created_at: string
  last_login: string | null
}

// ── Events ────────────────────────────────────────────────────
export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled'
export type EventType   = 'workshop' | 'seminar' | 'hackathon' | 'session' | 'social'

export type Event = {
  event_id: string
  title: string
  description: string | null
  event_type: EventType
  category_name: string | null
  category_color: string | null
  start_datetime: string
  end_datetime: string
  venue: string | null
  is_online: boolean
  meeting_link: string | null
  max_seats: number
  seats_registered: number
  seats_available: number
  fill_percentage: number
  is_free: boolean
  ticket_price: number | null
  banner_url: string | null
  tags: string[]
  status: EventStatus
  created_by_name: string | null
  created_at: string
}

// ── Payments ──────────────────────────────────────────────────
export type TransactionStatus = 'pending' | 'success' | 'failed' | 'refunded'
export type GatewayType = 'stripe' | 'manual' | 'simulated'

export type Transaction = {
  transaction_id: string
  invoice_number: string | null
  status: TransactionStatus
  amount: number
  currency: string
  gateway: GatewayType
  initiated_at: string
  completed_at: string | null
  refunded_at: string | null
  payer_name: string
  payer_email: string
  event_title: string
  event_date: string
}

// ── Forum ─────────────────────────────────────────────────────
export type Thread = {
  thread_id: string
  title: string
  body_preview: string
  category_name: string | null
  category_color: string | null
  tags: string[]
  is_pinned: boolean
  is_locked: boolean
  upvote_count: number
  reply_count: number
  view_count: number
  author_id: string
  author_name: string
  author_avatar: string | null
  created_at: string
  last_reply_at: string | null
}

export type Reply = {
  reply_id: string
  thread_id: string
  parent_reply_id: string | null
  author_id: string
  author_name: string
  author_avatar: string | null
  body: string
  upvote_count: number
  is_deleted: boolean
  created_at: string
  updated_at: string
  replies?: Reply[]
}

// ── Recommendations ───────────────────────────────────────────
export type Recommendation = {
  recommendation_id: number
  event_id: string
  score: number
  reason_vector: {
    matched_tags: string[]
    category_match: boolean
    event_title: string
  }
  generated_at: string
  is_dismissed: boolean
  title: string
  start_datetime: string
  banner_url: string | null
  is_free: boolean
  ticket_price: number | null
  category_name: string | null
}

// ── CMS ───────────────────────────────────────────────────────
export type TeamMember = {
  member_id: string
  full_name: string
  role_title: string
  bio: string | null
  avatar_url: string | null
  linkedin_url: string | null
  github_url: string | null
  display_order: number
  is_active: boolean
}

export type Sponsor = {
  sponsor_id: string
  name: string
  logo_url: string
  website_url: string | null
  tier: 'platinum' | 'gold' | 'silver' | 'bronze'
  description: string | null
  display_order: number
}

// ── API Response wrappers ─────────────────────────────────────
export type ApiResponse<T> = {
  data: T | null
  error: string | null
  message?: string
}

export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  limit: number
  error: null
}