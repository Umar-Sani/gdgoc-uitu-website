import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function useRequireAdmin() {
  const { user } = useAuth();
  const router = useRouter();

  const isAdmin = user?.role_name === 'admin' || user?.role_name === 'super_admin';

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace('/admin/dashboard');
    }
  }, [user, isAdmin, router]);

  return { isAdmin };
}