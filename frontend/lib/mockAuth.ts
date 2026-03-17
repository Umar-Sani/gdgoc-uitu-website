import type { User } from '@shared/types'

export const MOCK_ENABLED = true

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
  admin: {
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

export const ACTIVE_MOCK_USER: User = mockUsers.editor