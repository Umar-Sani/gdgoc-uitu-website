'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
  category_id: number;
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

type EventFormProps = {
  mode: 'create' | 'edit';
  eventId?: string;
};

const EVENT_TYPES = ['workshop', 'seminar', 'hackathon', 'session', 'social', 'bootcamp'];

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-5">{title}</h2>
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EventForm({ mode, eventId }: EventFormProps) {
  const router = useRouter();
  const { token } = useAuth();

  const [form, setForm]           = useState<EventFormData>(EMPTY_FORM);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(mode === 'edit');
  const [generalError, setGeneralError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // ─── Fetch categories ───────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/api/events/categories`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setCategories(res.data);
      })
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
        category_id:    Number(form.category_id),
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

      // Redirect to events list after success
      router.push('/admin/events');

    } catch {
      setGeneralError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Loading state for edit mode ─────────────────────────────────────────────
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

        {/* General error */}
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

            {/* Free / Paid toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pricing
              </label>
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

            {/* Ticket price — only shown for paid events */}
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
            <Field label="Banner URL">
              <input
                type="url"
                value={form.banner_url}
                onChange={(e) => handleChange('banner_url', e.target.value)}
                placeholder="https://example.com/banner.jpg"
                className={inputClass()}
              />
            </Field>
            {form.banner_url && (
              <div className="mt-3 rounded-xl overflow-hidden border border-gray-100 h-40">
                <img
                  src={form.banner_url}
                  alt="Banner preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Cloudinary upload will be added in a later phase. For now paste an image URL.
            </p>
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

          {/* ── Publish Status ── */}
          <Section title="Status">
            <Field label="Event Status">
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className={inputClass()}
              >
                <option value="draft">Draft — not visible to public</option>
                <option value="published">Published — visible to public</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
          </Section>

          {/* ── Actions ── */}
          <div className="flex gap-3 pb-10">
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
      </div>
    </div>
  );
}