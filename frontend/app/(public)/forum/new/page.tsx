'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type Category = {
  category_id: number;
  name: string;
  color_hex: string;
};

const TAG_OPTIONS = [
  'Flutter', 'AI/ML', 'Web Development', 'Cloud', 'Android',
  'Open Source', 'General', 'Cybersecurity', 'DevOps', 'UI/UX',
];

export default function NewThreadPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [title, setTitle]           = useState('');
  const [body, setBody]             = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags]             = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [isLoading, setIsLoading]   = useState(false);
  const [generalError, setGeneralError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // Redirect if not logged in
  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  // Fetch categories
  useEffect(() => {
    fetch(`${API_URL}/api/forum/categories`)
      .then((r) => r.json())
      .then((res) => { if (res.data) setCategories(res.data); })
      .catch(console.error);
  }, []);

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required.';
    if (title.trim().length < 10) newErrors.title = 'Title must be at least 10 characters.';
    if (!body.trim()) newErrors.body = 'Body is required.';
    if (body.trim().length < 20) newErrors.body = 'Body must be at least 20 characters.';
    if (!categoryId) newErrors.categoryId = 'Please select a category.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setGeneralError('');

    try {
      const res = await fetch(`${API_URL}/api/forum/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          category_id: Number(categoryId),
          tags,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setGeneralError(json.error || 'Failed to create thread. Please try again.');
        return;
      }

      router.push(`/forum/${json.data.thread_id}`);

    } catch {
      setGeneralError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const inputClass = (hasError?: boolean) =>
    `w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${
      hasError
        ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
        : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="h-1 w-16 flex mb-4 rounded-full overflow-hidden">
            <div className="flex-1 bg-[#4285F4]" />
            <div className="flex-1 bg-[#EA4335]" />
            <div className="flex-1 bg-[#FBBC05]" />
            <div className="flex-1 bg-[#34A853]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Start a Discussion</h1>
          <p className="text-sm text-gray-500 mt-1">Ask a question or share something with the community</p>
        </div>

        {generalError && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Title */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your question or topic?"
                className={inputClass(!!errors.title)}
              />
              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={inputClass(!!errors.categoryId)}
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && <p className="mt-1 text-xs text-red-500">{errors.categoryId}</p>}
            </div>
          </div>

          {/* Body */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Body <span className="text-red-500">*</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe your question or topic in detail..."
              rows={8}
              className={inputClass(!!errors.body)}
            />
            <div className="flex justify-between mt-1">
              {errors.body
                ? <p className="text-xs text-red-500">{errors.body}</p>
                : <span />
              }
              <p className="text-xs text-gray-400">{body.length} characters</p>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tags <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    tags.includes(tag)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {tags.length > 0 && (
              <p className="mt-2 text-xs text-blue-500">{tags.length} selected</p>
            )}
          </div>

          {/* Actions */}
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
                  Posting...
                </span>
              ) : (
                'Post Thread'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}