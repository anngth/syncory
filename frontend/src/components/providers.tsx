'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const fetchUser = useAuthStore((state) => state.fetchUser);

  useEffect(() => {
    // Check if user is authenticated on mount
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchUser();
    }
  }, [fetchUser]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
