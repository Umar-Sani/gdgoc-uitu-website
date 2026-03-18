import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function useRequireAdmin({ superAdminOnly = false }: { superAdminOnly?: boolean } = {}) {
  const { user } = useAuth();
  const router = useRouter();

  const isSuperAdmin = user?.role_name === 'super_admin';
  const isAdmin = user?.role_name === 'admin' || isSuperAdmin;
  const hasAccess = superAdminOnly ? isSuperAdmin : isAdmin;

  useEffect(() => {
    if (user && !hasAccess) {
      router.replace('/admin/dashboard');
    }
  }, [user, hasAccess, router]);

  return { isAdmin, isSuperAdmin, hasAccess };
}