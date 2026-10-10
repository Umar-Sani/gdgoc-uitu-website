import type { User } from '@shared/types'

// Opt-in per developer via frontend/.env.local: NEXT_PUBLIC_ENABLE_MOCK_AUTH=true.
// Both operands are inlined at build time, and `next build` always sets NODE_ENV to
// 'production', so this folds to a constant `false` in every deployed bundle and the
// mock branches are dead code there (TODO-013). The backend must also have
// ALLOW_MOCK_AUTH=true for the 'mock-token' to be accepted.
export const MOCK_ENABLED =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true'

export const mockUsers: Record<string, User> = {
  member: {
    user_id: 'mock-member-001',
    email: 'member@gdgoc.com',
    full_name: 'Test Member',
    username: 'testmember',
    role_name: 'user',
    avatar_url: null,
    bio: 'Community member interested in Flutter and Web.',
    skill_tags: ['Flutter', 'Web'],
    is_verified: true,
    is_active: true,
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
  },
  super_admin: {
    user_id: '30d7d27e-2a0c-44cb-8db4-bcc915a69067',
    email: 'admin@gdgoc.com',
    full_name: 'Test Admin',
    username: 'testadmin',
    role_name: 'super_admin',
    avatar_url: null,
    bio: null,
    skill_tags: [],
    is_verified: true,
    is_active: true,
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
  },
  admin: {
    user_id: '30d7d27e-2a0c-44cb-8db4-bcc915a69067',
    email: 'admin@gdgoc.com',
    full_name: 'Test Admin',
    username: 'testadmin',
    role_name: 'admin',
    avatar_url: null,
    bio: null,
    skill_tags: [],
    is_verified: true,
    is_active: true,
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
  },
  editor: {
    user_id: '30d7d27e-2a0c-44cb-8db4-bcc915a69067',
    email: 'editor@gdgoc.com',
    full_name: 'Test Editor',
    username: 'testeditor',
    role_name: 'editor',
    avatar_url: null,
    bio: null,
    skill_tags: ['AI/ML'],
    is_verified: true,
    is_active: true,
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
  },
}

export const ACTIVE_MOCK_USER: User = mockUsers.admin