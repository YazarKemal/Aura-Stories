/**
 * Client-side Chat + Lore Memory Module
 *
 * DeepSeek API çağrıları Firebase Functions (characterChat) üzerinden
 * güvenli şekilde yapılır. API anahtarı istemciye GÖMÜLMEZ.
 *
 * Lore memory yönetimi client-side localStorage'da tutulur.
 * System prompt SUNUCU TARAFINDAN buildChatPrompt() ile oluşturulur —
 * istemci HAM systemPrompt, model, max_tokens GÖNDEREMEZ.
 */
import {
  loadMemory,
  saveMemory,
  extractNewFacts,
  updateConversationSummary,
  type LearnedFact,
} from '@/lib/lore-memory';
import { buildReaderPersonaContext, getReaderPersona } from '@/lib/reader-persona';
import { getCharactersForStory } from '@/lib/character-roster';

// ── Types ────────────────────────────────────────────────────

export interface ChatRequestPayload {
  storyId: string;
  storyTitle: string;
  storySynopsis: string;
  storyLongSynopsis?: string;
  storyTags?: string[];
  storyAuthor: string;
  characterName: string;
  characterRole?: string;
  characterPersonality?: string;
  messages: { text: string; sender: 'user' | 'character' }[];
  /** Benzersiz işlem ID — idempotency için (server-authoritative) */
  operationId: string;
  /** Lore memory verisi — system prompt sunucuda bundan oluşturulur */
  memoryContext?: {
    personality: string;
    knownSecrets: string[];
    hiddenSecrets: string[];
    learnedFacts: LearnedFact[];
    conversationSummary: string;
  };
}

export interface ChatResponsePayload {
  text: string;
  characterName: string;
  memoryUpdates?: {
    newFactsLearned: LearnedFact[];
    hiddenSecretsRemaining: number;
  };
}

// ── Public API ────────────────────────────────────────────────

/**
 * Karakterle sohbet mesajı gönderir.
 * Firebase Functions (characterChat) üzerinden güvenli şekilde
 * DeepSeek API'ye çağrı yapar. API anahtarı istemciye GÖMÜLMEZ.
 * Hafıza yönetimini (lore) client-side localStorage'da tutar.
 *
 * Reader Persona karakter sohbetine her çağrıda eklenir. Böylece karakter,
 * karşısındaki kişiyi uygulama dışındaki bir "okuyucu" olarak değil,
 * hikâye evreninde gerçekten bulunan bir kişi olarak ele alır.
 */
export async function sendChatMessage(
  payload: ChatRequestPayload
): Promise<ChatResponsePayload> {
  if (!payload.storyTitle || !payload.characterName) {
    throw new Error('storyTitle ve characterName zorunludur');
  }

  // ── 1. Hafızayı yükle ──────────────────────────────────
  const memory = loadMemory(
    payload.storyId || payload.storyTitle,
    payload.storyTitle,
    payload.characterName
  );

  // Roster'daki kanonik karakter profili aynı hikâyedeki tüm karakterlerin
  // yalnızca tür etiketlerinden aynı kişiliği almasını engeller.
  const rosterCharacter = getCharactersForStory(payload.storyId)
    .find(character => character.name === payload.characterName);
  const characterRole = payload.characterRole || rosterCharacter?.role;
  const characterPersonality = payload.characterPersonality || rosterCharacter?.personality || memory.personality;

  // ── 2. Kullanıcının son mesajından yeni bilgi çıkar ────
  const lastUserMsg = [...payload.messages].reverse().find(m => m.sender === 'user');
  const newFactsLearned: LearnedFact[] = [];

  if (lastUserMsg) {
    const extracted = extractNewFacts(memory, lastUserMsg.text);

    for (const fact of extracted) {
      memory.learnedFacts.push(fact);
      memory.hiddenSecrets = memory.hiddenSecrets.filter(s => s !== fact.fact);
      if (!memory.knownSecrets.includes(fact.fact)) {
        memory.knownSecrets.push(fact.fact);
      }
    }

    newFactsLearned.push(...extracted);
  }

  // ── 3. Reader Persona + lore context ───────────────────
  const readerPersona = await getReaderPersona();
  const personaContext = buildReaderPersonaContext(readerPersona);
  const conversationSummary = [personaContext, memory.conversationSummary]
    .filter(Boolean)
    .join('\n');

  const memoryContext = {
    personality: characterPersonality,
    knownSecrets: memory.knownSecrets,
    hiddenSecrets: memory.hiddenSecrets,
    learnedFacts: memory.learnedFacts,
    conversationSummary,
  };

  // ── 4. Firebase Functions üzerinden DeepSeek çağrısı ──
  const { callCharacterChat } = await import('@/lib/functions-client');

  let aiText: string;
  try {
    const result = await callCharacterChat({
      storyId: payload.storyId,
      storyTitle: payload.storyTitle,
      storySynopsis: payload.storySynopsis,
      storyLongSynopsis: payload.storyLongSynopsis,
      storyTags: payload.storyTags,
      storyAuthor: payload.storyAuthor,
      characterName: payload.characterName,
      characterRole,
      characterPersonality,
      messages: payload.messages,
      operationId: payload.operationId,
      memoryContext,
    });
    aiText = result.text;
  } catch (err: unknown) {
    if (err instanceof Error) {
      const msg = err.message;
      const colonIdx = msg.indexOf(': ');
      throw new Error(colonIdx > 0 ? msg.slice(colonIdx + 2) : msg);
    }
    throw err;
  }

  if (!aiText) {
    throw new Error('AI yanıt üretemedi.');
  }

  // ── 5. Konuşma özetini güncelle ───────────────────────
  const recentMessages = [
    ...payload.messages.slice(-4),
    { text: aiText, sender: 'character' as const },
  ];
  updateConversationSummary(memory, recentMessages);

  // ── 6. Hafızayı kaydet ────────────────────────────────
  saveMemory(memory);

  // ── 7. Yanıtı döndür ──────────────────────────────────
  const result: ChatResponsePayload = {
    text: aiText,
    characterName: payload.characterName,
  };

  if (newFactsLearned.length > 0) {
    result.memoryUpdates = {
      newFactsLearned,
      hiddenSecretsRemaining: memory.hiddenSecrets.length,
    };
  }

  return result;
}
