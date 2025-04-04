"use client";

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';

export default function ProtectedRoute({
  children,
  allowedDivisions = [],
}: {
  children: React.ReactNode;
  allowedDivisions?: string[];
}) {
  const { isAuthenticated, userDivision, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/');
      } else if (allowedDivisions.length > 0 && userDivision && !allowedDivisions.includes(userDivision)) {
        // Redirect to appropriate dashboard if user doesn't have access
        router.push(`/${userDivision}/dashboard`);
      }
    }
  }, [isAuthenticated, loading, userDivision, allowedDivisions, router]);

  if (loading || !isAuthenticated) {
    return <div>Loading...</div>; // Or a better loading component
  }

  if (allowedDivisions.length > 0 && userDivision && !allowedDivisions.includes(userDivision)) {
    return <div>Unauthorized</div>; // Or a better unauthorized component
  }

  return <>{children}</>;
}