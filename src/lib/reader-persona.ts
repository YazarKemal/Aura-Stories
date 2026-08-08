'use client';

import { auth, getFirestoreUser } from '@/lib/firebase';

export interface ReaderPersona {
  name: string;
  role: string;
  traits: string[];
  note: string;
}

const LEGACY_STORAGE_KEY = 'aura-reader-persona-v1';
const STORAGE_PREFIX = 'aura-reader-persona-v2';

function personaKey(storyId?: string): string {
  return storyId ? `${STORAGE_PREFIX}:${storyId}` : LEGACY_STORAGE_KEY;
}

function sanitizePersona(input: Partial<ReaderPersona> | null | undefined): ReaderPersona | null {
  if (!input || typeof input.name !== 'string' || !input.name.trim()) return null;
  const name = input.name.trim().slice(0, 80);
  const role = typeof input.role === 'string' && input.role.trim()
    ? input.role.trim().slice(0, 80)
    : 'Hikâyenin Misafiri';
  const traits = Array.isArray(input.traits)
    ? input.traits
        .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
        .slice(0, 6)
        .map(value => value.trim().slice(0, 60))
    : [];
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 500) : '';
  return { name, role, traits, note };
}

export function loadStoredReaderPersona(storyId?: string): ReaderPersona | null {
  if (typeof window === 'undefined') return null;
  try {
    const storyRaw = storyId ? window.localStorage.getItem(personaKey(storyId)) : null;
    if (storyRaw) return sanitizePersona(JSON.parse(storyRaw));

    // QA7 öncesi global persona varsa yeni hikâyede başlangıç şablonu olarak kullan.
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    return legacyRaw ? sanitizePersona(JSON.parse(legacyRaw)) : null;
  } catch {
    return null;
  }
}

export function saveReaderPersona(persona: ReaderPersona, storyId?: string): void {
  if (typeof window === 'undefined') return;
  const normalized = sanitizePersona(persona);
  if (!normalized) return;
  window.localStorage.setItem(personaKey(storyId), JSON.stringify(normalized));
}

export async function getReaderPersona(storyId?: string): Promise<ReaderPersona> {
  const stored = loadStoredReaderPersona(storyId);
  if (stored) return stored;

  const currentUser = auth.currentUser;
  let profileName = currentUser?.displayName?.trim() || '';

  if (!profileName && currentUser?.uid) {
    try {
      const profile = await getFirestoreUser(currentUser.uid);
      profileName = profile?.name?.trim() || '';
    } catch {
      // Persona üretimi sohbeti engellememeli; fallback yeterlidir.
    }
  }

  if (!profileName) {
    profileName = currentUser?.email?.split('@')[0]?.trim() || 'Gezgin';
  }

  const persona: ReaderPersona = {
    name: profileName.slice(0, 80),
    role: 'Hikâyenin Misafiri',
    traits: [],
    note: 'Bu kişi hikâye evrenine dışarıdan bakan bir okuyucu değil; karakterlerin karşısında gerçekten bulunan bir katılımcıdır.',
  };

  if (typeof window !== 'undefined' && currentUser?.uid) {
    try { saveReaderPersona(persona, storyId); } catch { /* storage opsiyonel */ }
  }
  return persona;
}

export function buildReaderPersonaContext(persona: ReaderPersona): string {
  const traits = persona.traits.length > 0 ? ` Özellikleri: ${persona.traits.join(', ')}.` : '';
  const note = persona.note ? ` ${persona.note}` : '';
  return `KARŞINDAKİ KİŞİ: ${persona.name}. Rolü: ${persona.role}.${traits}${note} Ona “okuyucu”, “kullanıcı” veya “uygulamayı kullanan kişi” diye hitap etme; hikâye evreninde bulunan gerçek bir insan gibi davran.`;
}
