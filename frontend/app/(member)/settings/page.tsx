'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { User, Lock, Bell, ChevronRight, Home } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ImageUpload from '@/components/ui/ImageUpload';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Tab = 'profile' | 'email-password' | 'notifications';

// ── Notification types ────────────────────────────────────────────────────

type NotifKey =
  | 'new_reply' | 'mention' | 'upvote_received' | 'event_reminder'
  | 'registration_confirmed' | 'report_reviewed' | 'system_announcement';

type PrefsData = {
  email_enabled: boolean;
  inapp: Partial<Record<NotifKey, boolean>>;
  email: Partial<Record<NotifKey, boolean>>;
};

const INAPP_DEFAULTS: Record<NotifKey, boolean> = {
  new_reply: true, mention: true, upvote_received: true,
  event_reminder: true, registration_confirmed: true,
  report_reviewed: true, system_announcement: true,
};
const EMAIL_DEFAULTS: Record<NotifKey, boolean> = {
  mention: true, event_reminder: true, system_announcement: true,
  new_reply: false, upvote_received: false, report_reviewed: false,
  registration_confirmed: true,
};
const PREF_DEFAULTS: PrefsData = { email_enabled: false, inapp: INAPP_DEFAULTS, email: EMAIL_DEFAULTS };

const NOTIF_CONFIG: { key: NotifKey; label: string; desc: string; emailAlwaysOn?: true }[] = [
  { key: 'new_reply',              label: 'Thread Replies',    desc: 'When someone replies to a forum thread you started.' },
  { key: 'mention',                label: 'Mentions',          desc: 'When someone @mentions you in a thread or reply.' },
  { key: 'upvote_received',        label: 'Upvotes',           desc: 'When your thread receives an upvote from the community.' },
  { key: 'event_reminder',         label: 'Event Reminders',   desc: "Reminders before events you're registered for." },
  { key: 'registration_confirmed', label: 'Event Registration', desc: 'Confirmation when you successfully register for an event.', emailAlwaysOn: true },
  { key: 'report_reviewed',        label: 'Report Updates',    desc: 'When a moderation report you submitted has been reviewed.' },
  { key: 'system_announcement',    label: 'Announcements',     desc: 'Platform-wide updates, news, and community announcements.' },
];

const SKILL_TAGS = [
  'Flutter', 'AI/ML', 'Web Development', 'Cloud', 'Android',
  'Open Source', 'General', 'Cybersecurity', 'DevOps', 'UI/UX',
];

// ── Toggle ────────────────────────────────────────────────────────────────

function Toggle({
  checked, onChange, disabled = false, size = 'md',
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const track = size === 'sm' ? 'w-9 h-5' : 'w-11 h-6';
  const thumb = size === 'sm' ? 'w-3.5 h-3.5 top-[3px] left-[3px]' : 'w-5 h-5 top-0.5 left-0.5';
  const translate = size === 'sm' ? 'translate-x-4' : 'translate-x-5';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange?.(!checked)}
      className={`relative flex-shrink-0 ${track} rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ${
        disabled
          ? checked ? 'bg-[#34A853] cursor-default opacity-70' : 'bg-gray-200 cursor-default opacity-40'
          : checked ? 'bg-[#4285F4] cursor-pointer' : 'bg-gray-200 cursor-pointer hover:bg-gray-300'
      }`}
    >
      <span className={`absolute ${thumb} rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? translate : 'translate-x-0'}`} />
    </button>
  );
}

// ── Notification item row (toggle LEFT, text RIGHT) ───────────────────────

function NotifItemRow({
  label, desc, checked, onChange, disabled, badge,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <div className={`flex items-start gap-3 py-3.5 border-b border-gray-100 last:border-b-0 transition-opacity ${disabled ? 'opacity-40' : ''}`}>
      <div className="mt-0.5 flex-shrink-0">
        <Toggle checked={checked} onChange={onChange} disabled={disabled} size="sm" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 leading-tight">{label}</p>
          {badge}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ── Two-column notification section ──────────────────────────────────────

function NotifSection({
  title, description, extra, children,
}: {
  title: string;
  description: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-10 py-7 border-b border-gray-100 last:border-b-0">
      {/* Left: section label + description */}
      <div className="w-48 flex-shrink-0">
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
        {extra && <div className="mt-3">{extra}</div>}
      </div>
      {/* Right: rows */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}

// ── SaveBar ───────────────────────────────────────────────────────────────

function SaveBar({ onSave, saving, saved, error }: {
  onSave: () => void; saving: boolean; saved: boolean; error: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {saved && (
        <span className="text-sm text-[#34A853] font-medium flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Saved
        </span>
      )}
      {error && <span className="text-sm text-red-500">{error}</span>}
      <button
        onClick={onSave}
        disabled={saving}
        className="px-4 py-2 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────

function Card({ title, description, action, children }: {
  title: string; description?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          {description && <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { token, loading, user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Profile state
  const [profileData, setProfileData] = useState({
    full_name: '', username: '', bio: '', avatar_url: '', skill_tags: [] as string[],
  });
  const [currentEmail, setCurrentEmail]   = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving]   = useState(false);
  const [profileSaved, setProfileSaved]     = useState(false);
  const [profileError, setProfileError]     = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'same'>('idle');
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Email & Password state
  const [newEmail, setNewEmail]   = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaved, setEmailSaved]   = useState(false);
  const [emailError, setEmailError]   = useState('');

  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved]   = useState(false);
  const [pwError, setPwError]   = useState('');

  const [profileDirty, setProfileDirty] = useState(false);
  const [prefsDirty, setPrefsDirty]     = useState(false);

  // Notification prefs state
  const [prefs, setPrefs]               = useState<PrefsData>(PREF_DEFAULTS);
  const [prefsFetching, setPrefsFetching] = useState(true);
  const [prefsSaving, setPrefsSaving]     = useState(false);
  const [prefsSaved, setPrefsSaved]       = useState(false);
  const [prefsError, setPrefsError]       = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => {
        if (res.data) {
          const d = res.data;
          setProfileData({ full_name: d.full_name || '', username: d.username || '', bio: d.bio || '', avatar_url: d.avatar_url || '', skill_tags: d.skill_tags || [] });
          setOriginalUsername(d.username || '');
          setCurrentEmail(d.email || '');
        }
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/users/me/preferences`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => {
        if (res.data) {
          setPrefs({ email_enabled: res.data.email_enabled ?? false, inapp: { ...INAPP_DEFAULTS, ...res.data.inapp }, email: { ...EMAIL_DEFAULTS, ...res.data.email } });
        }
      })
      .catch(() => {})
      .finally(() => setPrefsFetching(false));
  }, [token]);

  useEffect(() => {
    const u = profileData.username;
    if (!u || u.length < 3)    { setUsernameStatus('idle'); return; }
    if (u === originalUsername) { setUsernameStatus('same'); return; }
    setUsernameStatus('checking');
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    usernameTimer.current = setTimeout(async () => {
      try {
        const { data } = await supabase.schema('users').from('users').select('username').eq('username', u.toLowerCase()).maybeSingle();
        setUsernameStatus(data ? 'taken' : 'available');
      } catch { setUsernameStatus('idle'); }
    }, 600);
    return () => { if (usernameTimer.current) clearTimeout(usernameTimer.current); };
  }, [profileData.username, originalUsername]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (profileDirty || prefsDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [profileDirty, prefsDirty]);

  function handleTabSwitch(newTab: Tab) {
    const isDirty = (activeTab === 'profile' && profileDirty) || (activeTab === 'notifications' && prefsDirty);
    if (isDirty && !window.confirm('You have unsaved changes. Discard them and switch tabs?')) return;
    setActiveTab(newTab);
  }

  async function handleSaveProfile() {
    if (!token) return;
    if (profileData.username.length < 3) { setProfileError('Username must be at least 3 characters.'); return; }
    if (usernameStatus === 'taken')       { setProfileError('That username is already taken.'); return; }
    if (usernameStatus === 'checking')    { setProfileError('Please wait — checking username…'); return; }
    setProfileSaving(true); setProfileSaved(false); setProfileError('');
    try {
      const res = await fetch(`${API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: profileData.full_name || null, username: profileData.username.trim().toLowerCase() || null, bio: profileData.bio.trim() || null, avatar_url: profileData.avatar_url || null, skill_tags: profileData.skill_tags }),
      });
      const json = await res.json();
      if (!res.ok) { setProfileError(json.error || 'Failed to save.'); return; }
      setOriginalUsername(json.data.username || '');
      setUsernameStatus('same');
      setProfileDirty(false);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch { setProfileError('Something went wrong.'); }
    finally  { setProfileSaving(false); }
  }

  async function handleUpdateEmail() {
    if (!newEmail.trim()) { setEmailError('Please enter a new email address.'); return; }
    setEmailSaving(true); setEmailSaved(false); setEmailError('');
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) { setEmailError(error.message); return; }
      setEmailSaved(true); setNewEmail('');
      setTimeout(() => setEmailSaved(false), 6000);
    } catch { setEmailError('Something went wrong.'); }
    finally  { setEmailSaving(false); }
  }

  async function handleUpdatePassword() {
    if (!newPassword)                    { setPwError('Please enter a new password.'); return; }
    if (newPassword.length < 8)          { setPwError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return; }
    setPwSaving(true); setPwSaved(false); setPwError('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { setPwError(error.message); return; }
      setPwSaved(true); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => setPwSaved(false), 3000);
    } catch { setPwError('Something went wrong.'); }
    finally  { setPwSaving(false); }
  }

  async function handleSavePrefs() {
    if (!token) return;
    setPrefsSaving(true); setPrefsSaved(false); setPrefsError('');
    try {
      const res = await fetch(`${API_URL}/api/users/me/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email_enabled: prefs.email_enabled, inapp: prefs.inapp, email: prefs.email }),
      });
      const json = await res.json();
      if (!res.ok) { setPrefsError(json.error || 'Failed to save.'); return; }
      setPrefsDirty(false);
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 3000);
    } catch { setPrefsError('Something went wrong.'); }
    finally  { setPrefsSaving(false); }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-blue-400 border-t-transparent" />
      </div>
    );
  }

  const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: 'profile',        label: 'Profile',          Icon: User },
    { id: 'email-password', label: 'Email & Password', Icon: Lock },
    { id: 'notifications',  label: 'Notifications',    Icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Breadcrumb + page title */}
        <div className="mb-8">
          <nav className="flex items-center gap-1.5 text-sm mb-3">
            <Link href="/dashboard" className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors">
              <Home className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-gray-900 font-medium">Settings</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account, security, and notification preferences.</p>
        </div>

        <div className="flex gap-7 items-start">

          {/* ── Sidebar ──────────────────────────────────────────── */}
          <aside className="w-56 flex-shrink-0 sticky top-8">
            <nav className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => handleTabSwitch(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-all text-left border-l-[3px] ${
                    activeTab === id
                      ? 'border-[#4285F4] bg-blue-50/70 text-[#4285F4]'
                      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </nav>

            {/* Back link below sidebar */}
            <Link
              href="/dashboard"
              className="flex items-center gap-2 mt-4 px-2 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
          </aside>

          {/* ── Content ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* ===== PROFILE TAB ===== */}
            {activeTab === 'profile' && (
              <Card
                title="Profile"
                description="Update your public profile information visible to the GDGOC community."
                action={
                  <SaveBar onSave={handleSaveProfile} saving={profileSaving} saved={profileSaved} error={profileError} />
                }
              >
                {profileLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin w-8 h-8 rounded-full border-4 border-blue-400 border-t-transparent" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-5 pb-6 border-b border-gray-100">
                      <ImageUpload
                        value={profileData.avatar_url}
                        onChange={v => { setProfileData(prev => ({ ...prev, avatar_url: v })); setProfileDirty(true); }}
                        token={token}
                        folder="gdgoc-uitu/avatars"
                        shape="circle"
                        previewClass="w-20 h-20 rounded-full"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Profile picture</p>
                        <p className="text-xs text-gray-400 mt-0.5">Upload a photo or use your Google picture.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                        <input
                          type="text"
                          value={profileData.full_name}
                          onChange={e => { setProfileData(prev => ({ ...prev, full_name: e.target.value })); setProfileDirty(true); }}
                          placeholder="Your full name"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">@</span>
                          <input
                            type="text"
                            value={profileData.username}
                            onChange={e => { setProfileData(prev => ({ ...prev, username: e.target.value.toLowerCase() })); setProfileDirty(true); }}
                            placeholder="yourname"
                            className="w-full pl-7 pr-24 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium whitespace-nowrap">
                            {usernameStatus === 'checking'  && <span className="text-gray-400">Checking…</span>}
                            {usernameStatus === 'available' && <span className="text-green-500">✓ Available</span>}
                            {usernameStatus === 'taken'     && <span className="text-red-500">✗ Taken</span>}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
                      <textarea
                        value={profileData.bio}
                        onChange={e => { setProfileData(prev => ({ ...prev, bio: e.target.value })); setProfileDirty(true); }}
                        rows={3}
                        placeholder="Tell the community a bit about yourself…"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Skill Interests</label>
                      <div className="flex flex-wrap gap-2">
                        {SKILL_TAGS.map(skill => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => {
                              setProfileData(prev => ({
                                ...prev,
                                skill_tags: prev.skill_tags.includes(skill)
                                  ? prev.skill_tags.filter(s => s !== skill)
                                  : [...prev.skill_tags, skill],
                              }));
                              setProfileDirty(true);
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              profileData.skill_tags.includes(skill)
                                ? 'bg-[#4285F4] text-white border-[#4285F4]'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                            }`}
                          >
                            {skill}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* ===== EMAIL & PASSWORD TAB ===== */}
            {activeTab === 'email-password' && (
              <>
                <Card
                  title="Email Address"
                  description={`Current address: ${currentEmail || '—'}. A confirmation link is sent to the new address before the change takes effect.`}
                >
                  <div className="space-y-4 max-w-sm">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">New Email</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={e => { setNewEmail(e.target.value); setEmailError(''); setEmailSaved(false); }}
                        placeholder="newemail@example.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                    {emailError && <p className="text-sm text-red-500">{emailError}</p>}
                    {emailSaved && <p className="text-sm text-[#34A853] font-medium">✓ Check your inbox to verify the new address.</p>}
                    <button onClick={handleUpdateEmail} disabled={emailSaving} className="px-4 py-2 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white text-sm font-semibold transition-all disabled:opacity-60">
                      {emailSaving ? 'Sending…' : 'Update Email'}
                    </button>
                  </div>
                </Card>

                <Card
                  title="Password"
                  description="Choose a strong password of at least 8 characters. Google sign-in users can set a password here to also enable email login."
                >
                  <div className="space-y-4 max-w-sm">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                      <input type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setPwError(''); setPwSaved(false); }} placeholder="At least 8 characters" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                      <input type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setPwError(''); setPwSaved(false); }} placeholder="Repeat new password" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
                    </div>
                    {pwError && <p className="text-sm text-red-500">{pwError}</p>}
                    {pwSaved && <p className="text-sm text-[#34A853] font-medium">✓ Password updated successfully.</p>}
                    <button onClick={handleUpdatePassword} disabled={pwSaving} className="px-4 py-2 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white text-sm font-semibold transition-all disabled:opacity-60">
                      {pwSaving ? 'Updating…' : 'Update Password'}
                    </button>
                  </div>
                </Card>
              </>
            )}

            {/* ===== NOTIFICATIONS TAB ===== */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">

                {/* Card header */}
                <div className="flex items-start justify-between gap-4 px-8 pt-8 pb-6 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Notification settings</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Select the kinds of notifications you get about your activities.</p>
                  </div>
                  <SaveBar onSave={handleSavePrefs} saving={prefsSaving} saved={prefsSaved} error={prefsError} />
                </div>

                {prefsFetching ? (
                  <div className="flex justify-center py-16">
                    <div className="animate-spin w-8 h-8 rounded-full border-4 border-blue-400 border-t-transparent" />
                  </div>
                ) : (
                  <div className="px-8 pb-8">

                    {/* ── Email notifications section ── */}
                    <NotifSection
                      title="Email notifications"
                      description="Get emails to find out what's going on when you're not online."
                      extra={
                        <div className="flex items-center gap-2">
                          <Toggle
                            checked={prefs.email_enabled}
                            onChange={v => { setPrefs(prev => ({ ...prev, email_enabled: v })); setPrefsDirty(true); }}
                            size="sm"
                          />
                          <span className="text-xs font-medium text-gray-500">
                            {prefs.email_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      }
                    >
                      {NOTIF_CONFIG.map(({ key, label, desc, emailAlwaysOn }) => (
                        <NotifItemRow
                          key={key}
                          label={label}
                          desc={desc}
                          checked={emailAlwaysOn ? true : (prefs.email[key] === true)}
                          onChange={emailAlwaysOn ? undefined : v => { setPrefs(prev => ({ ...prev, email: { ...prev.email, [key]: v } })); setPrefsDirty(true); }}
                          disabled={!emailAlwaysOn && !prefs.email_enabled}
                          badge={
                            emailAlwaysOn ? (
                              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-100">
                                Always on
                              </span>
                            ) : undefined
                          }
                        />
                      ))}
                    </NotifSection>

                    {/* ── In-app notifications section ── */}
                    <NotifSection
                      title="In-app notifications"
                      description="Get notifications inside the platform to find out what's going on while you're online."
                    >
                      {NOTIF_CONFIG.map(({ key, label, desc }) => (
                        <NotifItemRow
                          key={key}
                          label={label}
                          desc={desc}
                          checked={prefs.inapp[key] !== false}
                          onChange={v => { setPrefs(prev => ({ ...prev, inapp: { ...prev.inapp, [key]: v } })); setPrefsDirty(true); }}
                        />
                      ))}
                    </NotifSection>

                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
