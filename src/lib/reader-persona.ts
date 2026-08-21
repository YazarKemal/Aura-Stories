'use client';

import { auth, getFirestoreUser } from '@/lib/firebase';

export type IdentityDisclosure = 'contextual' | 'always' | 'anonymous';
export type CharacterEchoVisibility = 'private' | 'shared' | 'anonymous';

export interface ReaderPersona {
  /** Kullanıcının kendi branch'inde tercih ettiği kimlik. */
  name: string;
  role: string;
  traits: string[];
  note: string;
  /**
   * contextual: karakterler bu bilgiyi sohbet içinde öğrenmedikçe bilmez.
   * always: hikâye evreninde kimlik başlangıçtan bilinir kabul edilir.
   * anonymous: tercih edilen ad özel kalır; karakterlere otomatik açıklanmaz.
   */
  identityDisclosure: IdentityDisclosure;
  /**
   * private: Character Echo başka kullanıcılara açılmaz.
   * shared: paylaşılan branch'te bu persona AI Character Echo olabilir.
   * anonymous: Echo oluşabilir fakat hesap kimliğine bağlanmadan gösterilir.
   */
  echoVisibility: CharacterEchoVisibility;
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
  const identityDisclosure: IdentityDisclosure =
    input.identityDisclosure === 'always' || input.identityDisclosure === 'anonymous'
      ? input.identityDisclosure
      : 'contextual';
  const echoVisibility: CharacterEchoVisibility =
    input.echoVisibility === 'shared' || input.echoVisibility === 'anonymous'
      ? input.echoVisibility
      : 'private';

  return { name, role, traits, note, identityDisclosure, echoVisibility };
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
    note: 'Bu kişi hikâye evrenine dışarıdan bakan soyut bir okuyucu değil; gerektiğinde karakterlerle gerçek bir kişi gibi etkileşime girebilir.',
    // Hesap adı karakterlere kendiliğinden sızmamalı.
    identityDisclosure: 'contextual',
    // Açık izin verilene kadar başka kullanıcıların branch'inde Echo oluşmaz.
    echoVisibility: 'private',
  };

  if (typeof window !== 'undefined' && currentUser?.uid) {
    try { saveReaderPersona(persona, storyId); } catch { /* storage opsiyonel */ }
  }
  return persona;
}

/**
 * Character Room'a gönderilen persona bağlamı yalnız karakterin bilmesine izin
 * verilen bilgileri içerir. contextual ve anonymous modlarda tercih edilen ad,
 * rol ve özel not modele dahi verilmez; kimlik yalnız sohbetten veya server-side
 * Dynamic Story recognized state'inden öğrenilebilir.
 */
export function buildReaderPersonaContext(persona: ReaderPersona): string {
  const traits = persona.traits.length > 0 ? ` Genel davranış eğilimleri: ${persona.traits.join(', ')}.` : '';

  if (persona.identityDisclosure === 'anonymous') {
    return `KİMLİK GİZLİ: Karşındaki kişinin hesap/persona adı ve özel rolü sana açıklanmamıştır.${traits} Gerçek ad veya hesap kimliği uydurma. Kişi sohbet içinde bir lakap ya da geçici kimlik verirse yalnız onu kullan.`;
  }

  if (persona.identityDisclosure === 'always') {
    const note = persona.note ? ` Özel bağlam notu: ${persona.note}` : '';
    return `PERSONA BAĞLAMI: Karşındaki kişi bu hikâye dalında ${persona.name}. Rolü: ${persona.role}.${traits}${note} Bu kimliğin başlangıçtan bilindiği kabul edilir; yine de ona “okuyucu” veya “kullanıcı” deme.`;
  }

  return `KİMLİK BAĞLAMA GÖRE ÖĞRENİLİR: Karşındaki kişinin tercih ettiği ad, hikâye rolü ve özel persona notu sana henüz açıklanmamıştır.${traits} Ona isim veya rol uydurma. Bu bilgileri yalnız konuşmada kendisi açıklarsa ya da server Dynamic Story hafızası recognized olarak bildirirse kullan.`;
}
