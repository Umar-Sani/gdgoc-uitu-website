'use client';

import { useRequireAdmin } from '@/hooks/useRequireAdmin';

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  const { hasAccess } = useRequireAdmin();
  if (!hasAccess) return null;
  return <>{children}</>;
}