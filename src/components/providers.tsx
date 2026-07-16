'use client';

import { UserStateProvider } from '@/lib/user-state';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserStateProvider>
      {children}
      <Toaster />
    </UserStateProvider>
  );
}
