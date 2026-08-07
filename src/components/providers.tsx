'use client';

import { UserStateProvider } from '@/lib/user-state';
import { Toaster } from '@/components/ui/toaster';
import { MobileNativeBridge } from '@/components/mobile-native-bridge';
import { ParagraphCommentsOverlay } from '@/components/paragraph-comments-overlay';
import { DailyGiftBridge } from '@/components/daily-gift-bridge';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserStateProvider>
      {children}
      <MobileNativeBridge />
      <ParagraphCommentsOverlay />
      <DailyGiftBridge />
      <Toaster />
    </UserStateProvider>
  );
}
