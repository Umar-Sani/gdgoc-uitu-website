'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type FeaturedEvent = {
  id: string;
  event_id: string | null;
  title: string;
  description: string | null;
  image_url: string | null;
  event_date: string | null;
  category: string | null;
  display_order: number;
  is_active: boolean;
  linked_event_title: string | null;
};

type ExistingEvent = {
  event_id: string;
  title: string;
  status: string;
};

const emptyForm = {
  event_id:      '',
  title:         '',
  description:   '',
  image_url:     '',
  event_date:    '',
  category:      '',
  display_order: 0,
  is_active:     true,
};

export default function FeaturedEventsCMSPage() {
  const { token } = useAuth();
  const router = useRouter();

  const [items, setItems]           = useState<FeaturedEvent[]>([]);
  const [existingEvents, setExistingEvents] = useState<ExistingEvent[]>([]);
  const [editing, setEditing]       = useState<string | null>(null);
  const [adding, setAdding]         = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [form, setForm]             = useState(emptyForm);
  const [linkMode, setLinkMode]     = useState<'existing' | 'custom'>('custom');

  useEffect(() => {
    fetchItems();
    fetchExistingEvents();
  }, []);

  function fetchItems() {
    fetch(`${API_URL}/api/cms/featured-events/all`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => setItems(res.data ?? []))
      .catch(() => {});
  }

  function fetchExistingEvents() {
    fetch(`${API_URL}/api/events?limit=100&status=published`)
      .then((r) => r.json())
      .then((res) => setExistingEvents(res.data ?? []))
      .catch(() => {});
  }

  function startAdd() {
    setAdding(true);
    setEditing(null);
    setError('');
    setLinkMode('custom');
    setForm(emptyForm);
  }

  function startEdit(item: FeaturedEvent) {
    setEditing(item.id);
    setAdding(false);
    setError('');
    setLinkMode(item.event_id ? 'existing' : 'custom');
    setForm({
      event_id:      item.event_id ?? '',
      title:         item.title ?? '',
      description:   item.description ?? '',
      image_url:     item.image_url ?? '',
      event_date:    item.event_date ? item.event_date.split('T')[0] : '',
      category:      item.category ?? '',
      display_order: item.display_order ?? 0,
      is_active:     item.is_active ?? true,
    });
  }

  function cancelForm() {
    setAdding(false);
    setEditing(null);
    setError('');
  }

  function handleField(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleEventLink(eventId: string) {
    const event = existingEvents.find((e) => e.event_id === eventId);
    if (event) {
      setForm((prev) => ({
        ...prev,
        event_id: eventId,
        title: event.title,
      }));
    } else {
      setForm((prev) => ({ ...prev, event_id: '' }));
    }
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        event_id:      linkMode === 'existing' && form.event_id ? form.event_id : null,
        title:         form.title.trim(),
        description:   form.description.trim() || null,
        image_url:     form.image_url.trim() || null,
        event_date:    form.event_date || null,
        category:      form.category.trim() || null,
        display_order: Number(form.display_order),
        is_active:     form.is_active,
      };

      const url    = adding ? `${API_URL}/api/cms/featured-events` : `${API_URL}/api/cms/featured-events/${editing}`;
      const method = adding ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to save.'); return; }

      setSuccess(adding ? 'Featured event added!' : 'Updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      cancelForm();
      fetchItems();
    } catch {
      setError('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Remove "${title}" from featured events?`)) return;
    try {
      await fetch(`${API_URL}/api/cms/featured-events/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchItems();
    } catch {
      setError('Failed to delete.');
    }
  }

  async function handleToggleActive(item: FeaturedEvent) {
    try {
      await fetch(`${API_URL}/api/cms/featured-events/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      fetchItems();
    } catch {
      setError('Failed to update.');
    }
  }

  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl border border-gray-200 hover:border-blue-300 transition-all"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Featured Past Events</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage events shown in the "Our Best Events" section on the homepage
            </p>
          </div>
          <button
            onClick={startAdd}
            className="ml-auto px-4 py-2 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all"
          >
            + Add Event
          </button>
        </div>

        {/* Feedback */}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-600">
            ✓ {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Add / Edit Form */}
        {(adding || editing) && (
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6 mb-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-5">
              {adding ? 'Add Featured Event' : 'Edit Featured Event'}
            </h2>

            {/* Link mode toggle */}
            <div className="mb-5">
              <p className="text-sm font-medium text-gray-700 mb-2">Event Type</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setLinkMode('existing')}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    linkMode === 'existing'
                      ? 'bg-[#4285F4] text-white border-[#4285F4]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  Link to Existing Event
                </button>
                <button
                  type="button"
                  onClick={() => setLinkMode('custom')}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    linkMode === 'custom'
                      ? 'bg-[#4285F4] text-white border-[#4285F4]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  Custom Event
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {linkMode === 'existing'
                  ? 'Select an event from your events list. Clicking the card will take visitors to the event page.'
                  : 'Add a custom event that was not on the platform — e.g. past events before the platform launched.'
                }
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Existing event selector */}
              {linkMode === 'existing' && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Select Event <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.event_id}
                    onChange={(e) => handleEventLink(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Choose an event...</option>
                    {existingEvents.map((e) => (
                      <option key={e.event_id} value={e.event_id}>
                        {e.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div className={linkMode === 'existing' ? '' : 'sm:col-span-2'}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleField('title', e.target.value)}
                  placeholder="e.g. Flutter Workshop 2025"
                  className={inputClass}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => handleField('category', e.target.value)}
                  placeholder="e.g. Workshop, Hackathon, Conference"
                  className={inputClass}
                />
              </div>

              {/* Event Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Event Date</label>
                <input
                  type="date"
                  value={form.event_date}
                  onChange={(e) => handleField('event_date', e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Image URL */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Image URL</label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => handleField('image_url', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className={inputClass}
                />
                {form.image_url && (
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="mt-2 h-32 w-full object-cover rounded-xl border border-gray-100"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Order</label>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => handleField('display_order', Number(e.target.value))}
                  min={0}
                  className={inputClass}
                />
              </div>

            </div>

            {/* Description */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => handleField('description', e.target.value)}
                rows={3}
                placeholder="Describe what made this event special..."
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Active toggle */}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleField('is_active', !form.is_active)}
                className={`relative w-10 h-5 rounded-full transition-all ${form.is_active ? 'bg-green-400' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.is_active ? 'left-5' : 'left-0.5'}`} />
              </button>
              <span className="text-sm text-gray-600">{form.is_active ? 'Visible on homepage' : 'Hidden from homepage'}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all disabled:opacity-60"
              >
                {saving ? 'Saving...' : adding ? 'Add Event' : 'Save Changes'}
              </button>
              <button
                onClick={cancelForm}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Events List */}
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-400">
              No featured events yet. Click "+ Add Event" to get started.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-4 transition-all ${
                  item.is_active ? 'border-gray-100' : 'border-gray-100 opacity-60'
                }`}
              >
                {/* Image or placeholder */}
                <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-6 h-6 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                    {item.category && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                        {item.category}
                      </span>
                    )}
                    {item.event_id && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600 border border-green-100">
                        Linked Event
                      </span>
                    )}
                    {!item.is_active && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        Hidden
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Order: {item.display_order}
                    {item.event_date && ` · ${new Date(item.event_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </p>
                </div>

                {/* Active toggle */}
                <button
                  onClick={() => handleToggleActive(item)}
                  className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${item.is_active ? 'bg-green-400' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${item.is_active ? 'left-5' : 'left-0.5'}`} />
                </button>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => startEdit(item)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.title)}
                    className="px-3 py-1.5 rounded-lg border border-red-100 text-xs font-medium text-red-500 hover:bg-red-50 transition-all"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}