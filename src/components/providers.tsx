'use client';

import { UserStateProvider } from '@/lib/user-state';

export function Providers({ children }: { children: React.ReactNode }) {
  return <UserStateProvider>{children}</UserStateProvider>;
}
