'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ImageUpload from '@/components/ui/ImageUpload';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
  category_id: string;
  name: string;
};

type EventFormData = {
  title: string;
  description: string;
  event_type: string;
  category_id: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  venue: string;
  max_seats: string;
  is_free: boolean;
  ticket_price: string;
  tags: string[];
  status: string;
  banner_url: string;
};

type EventPerson = {
  person_id: string;
  event_id: string;
  full_name: string;
  role: string;
  bio: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  organization: string | null;
  display_order: number;
};

type PersonFormData = {
  full_name: string;
  role: string;
  bio: string;
  avatar_url: string;
  linkedin_url: string;
  organization: string;
};

type EventFormProps = {
  mode: 'create' | 'edit';
  eventId?: string;
};

const EVENT_TYPES = ['workshop', 'seminar', 'hackathon', 'session', 'social'];

const PERSON_ROLES = ['Host', 'Speaker', 'Guest', 'Panelist', 'Moderator'];

const ROLE_COLORS: Record<string, string> = {
  Host:      '#4285F4',
  Speaker:   '#EA4335',
  Guest:     '#FBBC05',
  Panelist:  '#34A853',
  Moderator: '#9C27B0',
};

const TAG_OPTIONS = [
  'Flutter', 'AI/ML', 'Web Development', 'Cloud', 'Android',
  'Open Source', 'General', 'Cybersecurity', 'DevOps', 'UI/UX',
  'Kotlin', 'Python', 'JavaScript', 'TypeScript', 'GCP', 'Firebase',
];

const EMPTY_FORM: EventFormData = {
  title: '',
  description: '',
  event_type: 'workshop',
  category_id: '',
  start_date: '',
  start_time: '',
  end_date: '',
  end_time: '',
  venue: '',
  max_seats: '',
  is_free: true,
  ticket_price: '',
  tags: [],
  status: 'draft',
  banner_url: '',
};

const EMPTY_PERSON: PersonFormData = {
  full_name: '',
  role: 'Host',
  bio: '',
  avatar_url: '',
  linkedin_url: '',
  organization: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function combineDatetime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

function splitDatetime(isoStr: string): { date: string; time: string } {
  const d = new Date(isoStr);
  const date = d.toISOString().split('T')[0];
  const time = d.toTimeString().slice(0, 5);
  return { date, time };
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{title}</h2>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ─── Field Wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Input Classes ────────────────────────────────────────────────────────────

function inputClass(hasError?: boolean): string {
  return `w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${
    hasError
      ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
      : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
  }`;
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLORS[role] ?? '#6b7280';
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wide"
      style={{ backgroundColor: color }}
    >
      {role}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EventForm({ mode, eventId }: EventFormProps) {
  const router = useRouter();
  const { token } = useAuth();

  const [form, setForm]             = useState<EventFormData>(EMPTY_FORM);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [isLoading, setIsLoading]   = useState(false);
  const [isFetching, setIsFetching] = useState(mode === 'edit');
  const [generalError, setGeneralError] = useState('');

  // People state
  const [people, setPeople]               = useState<EventPerson[]>([]);
  const [addingPerson, setAddingPerson]   = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [personForm, setPersonForm]       = useState<PersonFormData>(EMPTY_PERSON);
  const [personSaving, setPersonSaving]   = useState(false);
  const [personError, setPersonError]     = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // ─── Fetch categories ───────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/api/events/categories`)
      .then((r) => r.json())
      .then((res) => { if (res.data) setCategories(res.data); })
      .catch(console.error);
  }, []);

  // ─── Fetch event data in edit mode ──────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'edit' || !eventId) return;

    fetch(`${API_URL}/api/events/${eventId}`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.data) return;
        const e = res.data;
        const start = splitDatetime(e.start_datetime);
        const end = splitDatetime(e.end_datetime);

        setForm({
          title:        e.title ?? '',
          description:  e.description ?? '',
          event_type:   e.event_type ?? 'workshop',
          category_id:  String(e.category_id ?? ''),
          start_date:   start.date,
          start_time:   start.time,
          end_date:     end.date,
          end_time:     end.time,
          venue:        e.venue ?? '',
          max_seats:    String(e.max_seats ?? ''),
          is_free:      e.is_free ?? true,
          ticket_price: e.ticket_price ? String(e.ticket_price) : '',
          tags:         e.tags ?? [],
          status:       e.status ?? 'draft',
          banner_url:   e.banner_url ?? '',
        });
      })
      .catch(console.error)
      .finally(() => setIsFetching(false));
  }, [mode, eventId]);

  // ─── Fetch people in edit mode ───────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'edit' || !eventId) return;
    fetchPeople();
  }, [mode, eventId]);

  function fetchPeople() {
    fetch(`${API_URL}/api/events/${eventId}/people`)
      .then((r) => r.json())
      .then((res) => setPeople(res.data ?? []))
      .catch(() => {});
  }

  // ─── Field change handler ───────────────────────────────────────────────────
  function handleChange(field: keyof EventFormData, value: string | boolean | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  }

  // ─── Tag toggle ─────────────────────────────────────────────────────────────
  function toggleTag(tag: string) {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  }

  // ─── Validation ─────────────────────────────────────────────────────────────
  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!form.title.trim())
      newErrors.title = 'Title is required.';

    if (!form.category_id)
      newErrors.category_id = 'Category is required.';

    if (!form.event_type)
      newErrors.event_type = 'Event type is required.';

    if (!form.start_date || !form.start_time)
      newErrors.start = 'Start date and time are required.';

    if (!form.end_date || !form.end_time)
      newErrors.end = 'End date and time are required.';

    if (form.start_date && form.end_date && form.start_time && form.end_time) {
      const start = new Date(`${form.start_date}T${form.start_time}`);
      const end = new Date(`${form.end_date}T${form.end_time}`);
      if (end <= start) {
        newErrors.end = 'End time must be after start time.';
      }
    }

    if (!form.max_seats || isNaN(Number(form.max_seats)) || Number(form.max_seats) < 1)
      newErrors.max_seats = 'Max seats must be at least 1.';

    if (!form.is_free && (!form.ticket_price || isNaN(Number(form.ticket_price)) || Number(form.ticket_price) <= 0))
      newErrors.ticket_price = 'Ticket price is required for paid events.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setGeneralError('');

    try {
      const payload = {
        title:          form.title.trim(),
        description:    form.description.trim() || null,
        event_type:     form.event_type,
        category_id:    form.category_id,
        start_datetime: combineDatetime(form.start_date, form.start_time),
        end_datetime:   combineDatetime(form.end_date, form.end_time),
        venue:          form.venue.trim() || null,
        max_seats:      Number(form.max_seats),
        is_free:        form.is_free,
        ticket_price:   form.is_free ? null : Number(form.ticket_price),
        tags:           form.tags,
        status:         form.status,
        banner_url:     form.banner_url.trim() || null,
      };

      const url = mode === 'create'
        ? `${API_URL}/api/events`
        : `${API_URL}/api/events/${eventId}`;

      const method = mode === 'create' ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setGeneralError(json.error || 'Something went wrong. Please try again.');
        return;
      }

      router.push('/admin/events');

    } catch {
      setGeneralError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // ─── People CRUD ─────────────────────────────────────────────────────────────

  function startAddPerson() {
    setPersonForm(EMPTY_PERSON);
    setPersonError('');
    setEditingPersonId(null);
    setAddingPerson(true);
  }

  function startEditPerson(p: EventPerson) {
    setPersonForm({
      full_name:    p.full_name,
      role:         p.role,
      bio:          p.bio ?? '',
      avatar_url:   p.avatar_url ?? '',
      linkedin_url: p.linkedin_url ?? '',
      organization: p.organization ?? '',
    });
    setPersonError('');
    setAddingPerson(false);
    setEditingPersonId(p.person_id);
  }

  async function savePerson() {
    if (!personForm.full_name.trim()) { setPersonError('Name is required.'); return; }
    if (!personForm.role) { setPersonError('Role is required.'); return; }

    setPersonSaving(true);
    setPersonError('');

    try {
      const body = {
        full_name:    personForm.full_name.trim(),
        role:         personForm.role,
        bio:          personForm.bio.trim() || null,
        avatar_url:   personForm.avatar_url.trim() || null,
        linkedin_url: personForm.linkedin_url.trim() || null,
        organization: personForm.organization.trim() || null,
      };

      const url = editingPersonId
        ? `${API_URL}/api/events/${eventId}/people/${editingPersonId}`
        : `${API_URL}/api/events/${eventId}/people`;

      const res = await fetch(url, {
        method: editingPersonId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) { setPersonError(json.error || 'Failed to save.'); return; }

      setAddingPerson(false);
      setEditingPersonId(null);
      setPersonForm(EMPTY_PERSON);
      fetchPeople();
    } catch {
      setPersonError('Something went wrong.');
    } finally {
      setPersonSaving(false);
    }
  }

  async function deletePerson(personId: string) {
    if (!confirm('Remove this person from the event?')) return;
    try {
      await fetch(`${API_URL}/api/events/${eventId}/people/${personId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPeople();
    } catch {
      setPersonError('Failed to delete.');
    }
  }

  // ─── Loading state ────────────────────────────────────────────────────────────
  if (isFetching) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
        <div className="h-48 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="h-1 w-16 flex mb-4 rounded-full overflow-hidden">
            <div className="flex-1 bg-[#4285F4]" />
            <div className="flex-1 bg-[#EA4335]" />
            <div className="flex-1 bg-[#FBBC05]" />
            <div className="flex-1 bg-[#34A853]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {mode === 'create' ? 'Create New Event' : 'Edit Event'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'create'
              ? 'Fill in the details below to create a new event.'
              : 'Update the event details below.'}
          </p>
        </div>

        {generalError && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* ── Basic Info ── */}
          <Section title="Basic Info">

            <Field label="Event Title" required error={errors.title}>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g. Flutter Workshop 2026"
                className={inputClass(!!errors.title)}
              />
            </Field>

            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe what attendees will learn or experience..."
                rows={4}
                className={inputClass()}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Event Type" required error={errors.event_type}>
                <select
                  value={form.event_type}
                  onChange={(e) => handleChange('event_type', e.target.value)}
                  className={inputClass(!!errors.event_type)}
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type} className="capitalize">
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Category" required error={errors.category_id}>
                <select
                  value={form.category_id}
                  onChange={(e) => handleChange('category_id', e.target.value)}
                  className={inputClass(!!errors.category_id)}
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

          </Section>

          {/* ── Date & Time ── */}
          <Section title="Date & Time">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Start Date" required error={errors.start}>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  className={inputClass(!!errors.start)}
                />
              </Field>
              <Field label="Start Time" required>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => handleChange('start_time', e.target.value)}
                  className={inputClass()}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="End Date" required error={errors.end}>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  className={inputClass(!!errors.end)}
                />
              </Field>
              <Field label="End Time" required>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => handleChange('end_time', e.target.value)}
                  className={inputClass()}
                />
              </Field>
            </div>

          </Section>

          {/* ── Location ── */}
          <Section title="Location">
            <Field label="Venue">
              <input
                type="text"
                value={form.venue}
                onChange={(e) => handleChange('venue', e.target.value)}
                placeholder="e.g. UIT University, Room 101 — or leave blank for Online"
                className={inputClass()}
              />
            </Field>
          </Section>

          {/* ── Capacity & Pricing ── */}
          <Section title="Capacity & Pricing">

            <Field label="Max Seats" required error={errors.max_seats}>
              <input
                type="number"
                value={form.max_seats}
                onChange={(e) => handleChange('max_seats', e.target.value)}
                placeholder="e.g. 50"
                min={1}
                className={inputClass(!!errors.max_seats)}
              />
            </Field>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pricing</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleChange('is_free', true)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    form.is_free
                      ? 'bg-green-500 text-white border-green-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                  }`}
                >
                  Free
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('is_free', false)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    !form.is_free
                      ? 'bg-[#4285F4] text-white border-[#4285F4]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  Paid
                </button>
              </div>
            </div>

            {!form.is_free && (
              <Field label="Ticket Price (PKR)" required error={errors.ticket_price}>
                <input
                  type="number"
                  value={form.ticket_price}
                  onChange={(e) => handleChange('ticket_price', e.target.value)}
                  placeholder="e.g. 500"
                  min={1}
                  className={inputClass(!!errors.ticket_price)}
                />
              </Field>
            )}

          </Section>

          {/* ── Banner ── */}
          <Section title="Banner Image">
            <ImageUpload
              value={form.banner_url}
              onChange={(url) => handleChange('banner_url', url)}
              token={token}
              folder="gdgoc-uitu/events"
              previewClass="w-full h-40 rounded-xl"
            />
          </Section>

          {/* ── Tags ── */}
          <Section title="Tags">
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    form.tags.includes(tag)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {form.tags.length > 0 && (
              <p className="text-xs text-blue-500 mt-1">{form.tags.length} selected</p>
            )}
          </Section>

          {/* ── Status ── */}
          <Section title="Status">
            <Field label="Event Status">
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className={inputClass()}
              >
                <option value="draft">Draft — not visible to public</option>
                <option value="published">Published — visible to public</option>
                <option value="ongoing">Ongoing — event in progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
          </Section>

          {/* ── Actions ── */}
          <div className="flex gap-3 pb-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 font-semibold text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white font-semibold text-sm transition-all shadow-md hover:shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {mode === 'create' ? 'Creating...' : 'Saving...'}
                </span>
              ) : (
                mode === 'create' ? 'Create Event' : 'Save Changes'
              )}
            </button>
          </div>

        </form>

        {/* ── Hosts, Speakers & Guests (edit mode only) ──────────────────────── */}
        {mode === 'edit' && eventId && (
          <div className="mb-10">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  Hosts, Speakers & Guests
                </h2>
                <button
                  type="button"
                  onClick={startAddPerson}
                  className="px-3 py-1.5 rounded-xl bg-[#4285F4] text-white text-xs font-semibold hover:bg-blue-600 transition-all"
                >
                  + Add Person
                </button>
              </div>

              {personError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600">
                  {personError}
                </div>
              )}

              {/* Inline add / edit form */}
              {(addingPerson || editingPersonId) && (
                <div className="mb-5 p-4 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-3">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    {editingPersonId ? 'Edit Person' : 'New Person'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                      <input
                        type="text"
                        value={personForm.full_name}
                        onChange={(e) => setPersonForm(p => ({ ...p, full_name: e.target.value }))}
                        placeholder="Full name"
                        className={inputClass()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
                      <select
                        value={personForm.role}
                        onChange={(e) => setPersonForm(p => ({ ...p, role: e.target.value }))}
                        className={inputClass()}
                      >
                        {PERSON_ROLES.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Organization</label>
                      <input
                        type="text"
                        value={personForm.organization}
                        onChange={(e) => setPersonForm(p => ({ ...p, organization: e.target.value }))}
                        placeholder="e.g. Google, UIT"
                        className={inputClass()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">LinkedIn URL</label>
                      <input
                        type="url"
                        value={personForm.linkedin_url}
                        onChange={(e) => setPersonForm(p => ({ ...p, linkedin_url: e.target.value }))}
                        placeholder="https://linkedin.com/in/..."
                        className={inputClass()}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Bio</label>
                      <textarea
                        value={personForm.bio}
                        onChange={(e) => setPersonForm(p => ({ ...p, bio: e.target.value }))}
                        placeholder="Short bio..."
                        rows={2}
                        className={inputClass()}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <ImageUpload
                        label="Avatar"
                        value={personForm.avatar_url}
                        onChange={(url) => setPersonForm(p => ({ ...p, avatar_url: url }))}
                        token={token}
                        folder="gdgoc-uitu/event-people"
                        shape="circle"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={savePerson}
                      disabled={personSaving}
                      className="px-4 py-2 rounded-xl bg-[#4285F4] text-white text-xs font-semibold hover:bg-blue-600 transition-all disabled:opacity-60"
                    >
                      {personSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddingPerson(false); setEditingPersonId(null); setPersonError(''); }}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:border-blue-300 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* People list */}
              {people.length === 0 && !addingPerson ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  No hosts, speakers, or guests added yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {people.map((p) => (
                    <div
                      key={p.person_id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        editingPersonId === p.person_id
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden bg-gray-100 border border-gray-200">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
                            {p.full_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-800 truncate">{p.full_name}</span>
                          <RoleBadge role={p.role} />
                        </div>
                        {p.organization && (
                          <p className="text-xs text-gray-400 truncate">{p.organization}</p>
                        )}
                      </div>

                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditPerson(p)}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePerson(p.person_id)}
                          className="p-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
