'use client';

import { useState, useEffect } from 'react';

type GalleryItem = {
  item_id: string;
  title: string;
  media_url: string;
  media_type: string;
  category: string | null;
  display_order: number;
};

export default function GalleryPage() {
  const [items, setItems]           = useState<GalleryItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<GalleryItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    fetch(`${API_URL}/api/cms/gallery`)
      .then((r) => r.json())
      .then((res) => { if (res.data) setItems(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = ['all', ...Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[]];
  const filtered = categoryFilter === 'all' ? items : items.filter((i) => i.category === categoryFilter);

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 py-20">
        <div className="h-1 w-full flex">
          <div className="flex-1 bg-[#4285F4]" />
          <div className="flex-1 bg-[#EA4335]" />
          <div className="flex-1 bg-[#FBBC05]" />
          <div className="flex-1 bg-[#34A853]" />
        </div>
        <div className="max-w-3xl mx-auto px-4 text-center pt-12">
          <h1 className="text-4xl font-bold text-white tracking-tight">Gallery</h1>
          <p className="mt-4 text-blue-200 text-sm">Moments from our events and community.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Category filter */}
        {!loading && categories.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all capitalize ${
                  categoryFilter === cat
                    ? 'bg-[#4285F4] text-white border-[#4285F4]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-16">No gallery items yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered
              .sort((a, b) => a.display_order - b.display_order)
              .map((item) => (
                <button
                  key={item.item_id}
                  onClick={() => setSelected(item)}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 hover:shadow-lg transition-all"
                >
                  {item.media_type === 'video' ? (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                      <svg className="w-10 h-10 text-white opacity-70" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  ) : (
                    <img
                      src={item.media_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="text-white text-xs font-semibold truncate">{item.title}</p>
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <button
            onClick={() => setSelected(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white bg-opacity-20 text-white flex items-center justify-center hover:bg-opacity-30 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div onClick={(e) => e.stopPropagation()} className="max-w-4xl w-full">
            {selected.media_type === 'video' ? (
              <video src={selected.media_url} controls className="w-full rounded-2xl" />
            ) : (
              <img src={selected.media_url} alt={selected.title} className="w-full rounded-2xl object-contain max-h-[80vh]" />
            )}
            <p className="text-white text-sm font-semibold text-center mt-4">{selected.title}</p>
          </div>
        </div>
      )}
    </div>
  );
}