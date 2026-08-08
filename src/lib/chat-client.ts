/**
 * Client-side Chat + Lore Memory Module
 *
 * DeepSeek API çağrıları Firebase Functions (characterChat) üzerinden
 * güvenli şekilde yapılır. API anahtarı istemciye GÖMÜLMEZ.
 *
 * Client lore yalnız yardımcı konuşma hafızasıdır. Hikâye kanonu, karakterin
 * bir iddiaya inanıp inanmadığı ve katılımcı statüsü server-side Dynamic Story
 * world state tarafından belirlenir.
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
import { findCachedDynamicCharacter } from '@/lib/character-roster-client';

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
  operationId: string;
  memoryContext?: {
    personality: string;
    knownSecrets: string[];
    hiddenSecrets: string[];
    learnedFacts: LearnedFact[];
    conversationSummary: string;
  };
}

export interface ChatWorldUpdate {
  revision: number;
  participantStatus: 'none' | 'noticed' | 'recognized';
  canonicalEvents: number;
}

export interface ChatResponsePayload {
  text: string;
  characterName: string;
  /** Server-side Dynamic Story güncellemesi; gerçek kanonik etki göstergesi. */
  worldUpdate?: ChatWorldUpdate;
  /** Legacy alan. Yeni UI kanonik etki için worldUpdate kullanmalıdır. */
  memoryUpdates?: {
    newFactsLearned: LearnedFact[];
    hiddenSecretsRemaining: number;
  };
}

export async function sendChatMessage(
  payload: ChatRequestPayload
): Promise<ChatResponsePayload> {
  if (!payload.storyTitle || !payload.characterName) {
    throw new Error('storyTitle ve characterName zorunludur');
  }

  const memory = loadMemory(
    payload.storyId || payload.storyTitle,
    payload.storyTitle,
    payload.characterName
  );

  const staticCharacter = getCharactersForStory(payload.storyId)
    .find(character => character.name === payload.characterName);
  const cachedDynamicCharacter = findCachedDynamicCharacter(payload.storyId, payload.characterName);
  const rosterCharacter = staticCharacter || cachedDynamicCharacter;
  const characterRole = payload.characterRole || rosterCharacter?.role;
  const characterPersonality = payload.characterPersonality || rosterCharacter?.personality || memory.personality;

  const lastUserMsg = [...payload.messages].reverse().find(m => m.sender === 'user');

  // Local extraction yalnız yardımcı "duyulmuş iddia" hafızasına eklenir.
  // Eskiden bu aşamada knownSecrets'e taşınıyordu; bu, karakter server-side
  // belief=rejected dese bile istemcinin iddiayı gerçek ilan etmesine yol açıyordu.
  if (lastUserMsg) {
    const extracted = extractNewFacts(memory, lastUserMsg.text);
    for (const fact of extracted) {
      const alreadyStored = memory.learnedFacts.some(existing => existing.fact === fact.fact);
      if (!alreadyStored) memory.learnedFacts.push(fact);
    }
  }

  const readerPersona = await getReaderPersona(payload.storyId);
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

  const { callCharacterChat } = await import('@/lib/functions-client');

  let functionResult: ChatResponsePayload;
  try {
    functionResult = await callCharacterChat({
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
  } catch (err: unknown) {
    if (err instanceof Error) {
      const msg = err.message;
      const colonIdx = msg.indexOf(': ');
      throw new Error(colonIdx > 0 ? msg.slice(colonIdx + 2) : msg);
    }
    throw err;
  }

  const aiText = functionResult.text;
  if (!aiText) {
    throw new Error('AI yanıt üretemedi.');
  }

  const recentMessages = [
    ...payload.messages.slice(-4),
    { text: aiText, sender: 'character' as const },
  ];
  updateConversationSummary(memory, recentMessages);
  saveMemory(memory);

  return {
    text: aiText,
    characterName: payload.characterName,
    worldUpdate: functionResult.worldUpdate,
  };
}
