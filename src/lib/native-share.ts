'use client';

import { Capacitor, registerPlugin } from '@capacitor/core';

interface AuraSharePlugin {
  shareInstagramStory(options: { dataUrl: string }): Promise<{ target: 'instagram_story' | 'android_share_sheet' }>;
}

const AuraShare = registerPlugin<AuraSharePlugin>('AuraShare');

export async function shareAuraStoryImage(dataUrl: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await AuraShare.shareInstagramStory({ dataUrl });
    return;
  }

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], `aura-story-${Date.now()}.png`, { type: 'image/png' });

  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({
      title: 'Aura Stories',
      text: 'Aura Stories alıntısı',
      files: [file],
    });
    return;
  }

  throw new Error('Bu cihaz görsel paylaşımını desteklemiyor.');
}
