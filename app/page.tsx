"use client";

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoginForm } from '@/components/login-form/page';

export default function Home() {
  const { isAuthenticated, userDivision, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated && userDivision) {
      router.push(`/${userDivision}/dashboard`);
    }
  }, [isAuthenticated, loading, userDivision, router]);

  if (loading || isAuthenticated) {
    return <div>Loading...</div>;
  }

  return <LoginForm />;
}