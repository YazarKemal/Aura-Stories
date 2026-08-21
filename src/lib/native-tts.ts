'use client';

import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle,
} from '@capacitor/core';

export interface TtsProgressEvent {
  state: 'start' | 'progress' | 'done' | 'error';
  start: number;
  end: number;
  length: number;
}

interface AuraTtsPlugin {
  speak(options: { text: string; rate?: number; language?: string }): Promise<{ speaking: boolean; length?: number }>;
  stop(): Promise<{ speaking: boolean }>;
  addListener(
    eventName: 'progress',
    listenerFunc: (event: TtsProgressEvent) => void
  ): Promise<PluginListenerHandle>;
}

const AuraTts = registerPlugin<AuraTtsPlugin>('AuraTts');

let webUtterance: SpeechSynthesisUtterance | null = null;

export async function speakStoryText(text: string, rate = 1): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await AuraTts.speak({ text, rate, language: 'tr-TR' });
    return;
  }

  if (!('speechSynthesis' in window)) {
    throw new Error('Bu cihaz sesli okumayı desteklemiyor.');
  }

  window.speechSynthesis.cancel();
  webUtterance = new SpeechSynthesisUtterance(text);
  webUtterance.lang = 'tr-TR';
  webUtterance.rate = Math.max(0.5, Math.min(rate, 2));
  window.speechSynthesis.speak(webUtterance);
}

export async function stopStorySpeech(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await AuraTts.stop();
    return;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  webUtterance = null;
}

export async function addTtsProgressListener(
  listener: (event: TtsProgressEvent) => void
): Promise<PluginListenerHandle | null> {
  if (!Capacitor.isNativePlatform()) return null;
  return AuraTts.addListener('progress', listener);
}
