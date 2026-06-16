'use client';

import { useRef, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  token: string | null;
  folder?: string;
  label?: string;
  shape?: 'square' | 'circle';
  previewClass?: string;
}

export default function ImageUpload({
  value,
  onChange,
  token,
  folder = 'gdgoc-uitu',
  label,
  shape = 'square',
  previewClass,
}: ImageUploadProps) {
  const inputRef    = useRef<HTMLInputElement>(null);
  const [preview,   setPreview]   = useState('');
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local blob preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setError('');
    setUploading(true);

    const body = new FormData();
    body.append('image', file);

    try {
      const res  = await fetch(
        `${API_URL}/api/upload?folder=${encodeURIComponent(folder)}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body },
      );
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Upload failed'); return; }
      onChange(json.url);
      setPreview(''); // real URL is now in `value` via onChange
    } catch {
      setError('Upload failed. Check your connection and try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const displaySrc  = preview || value;
  const isCircle    = shape === 'circle';
  const previewBase = isCircle
    ? 'w-16 h-16 rounded-full'
    : 'w-24 h-16 rounded-xl';

  return (
    <div>
      {label && (
        <p className="text-sm font-medium text-gray-700 mb-1.5">{label}</p>
      )}

      <div className="flex items-start gap-4">
        {/* Thumbnail preview */}
        <div
          className={`relative flex-shrink-0 ${previewClass ?? previewBase} bg-gray-100 border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center`}
        >
          {displaySrc ? (
            <img
              src={displaySrc}
              alt="preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <svg
              className="w-6 h-6 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          )}

          {/* Upload spinner overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 min-w-0 space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all disabled:opacity-60"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {uploading ? 'Uploading…' : value ? 'Replace Image' : 'Upload Image'}
          </button>

          {/* URL paste fallback */}
          <input
            type="text"
            value={value}
            onChange={(e) => { onChange(e.target.value); setPreview(''); }}
            placeholder="or paste a URL directly…"
            className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all text-gray-500 placeholder-gray-300"
          />
        </div>
      </div>

      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
