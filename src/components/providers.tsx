'use client';

import { UserStateProvider } from '@/lib/user-state';
import { Toaster } from '@/components/ui/toaster';
import { MobileNativeBridge } from '@/components/mobile-native-bridge';
import { ParagraphCommentsOverlay } from '@/components/paragraph-comments-overlay';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserStateProvider>
      {children}
      <MobileNativeBridge />
      <ParagraphCommentsOverlay />
      <Toaster />
    </UserStateProvider>
  );
}
