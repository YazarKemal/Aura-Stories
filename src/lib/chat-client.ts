/**
 * Client-side Chat + Lore Memory Module
 *
 * Statik export (output: 'export') ile uyumlu olması için
 * DeepSeek API çağrısı ve hafıza yönetimi client-side'a taşındı.
 * Eski API route: src/app/api/chat/route.ts
 */

import {
  loadMemory,
  saveMemory,
  extractNewFacts,
  buildMemoryContext,
  updateConversationSummary,
  type LearnedFact,
} from '@/lib/lore-memory';

// ── Types ────────────────────────────────────────────────────

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequestPayload {
  storyId: string;
  storyTitle: string;
  storySynopsis: string;
  storyLongSynopsis?: string;
  storyTags?: string[];
  storyAuthor: string;
  characterName: string;
  messages: { text: string; sender: 'user' | 'character' }[];
}

export interface ChatResponsePayload {
  text: string;
  characterName: string;
  memoryUpdates?: {
    newFactsLearned: LearnedFact[];
    hiddenSecretsRemaining: number;
  };
}

// ── System Prompt Builder ────────────────────────────────────

function buildSystemPrompt(req: ChatRequestPayload, memory: ReturnType<typeof loadMemory>): string {
  const tags = req.storyTags?.join(', ') || 'kurgu';

  const tagPersonalityMap: Record<string, string> = {
    'Romantik': 'tutkulu, duygusal ve romantik',
    'Mafya': 'sert, karizmatik ve tehlikeli',
    'Dram': 'derin düşünceli, melankolik ve içe dönük',
    'Fantastik': 'gizemli, güçlü ve büyülü',
    'Gizem': 'zeki, mesafeli ve sırlarla dolu',
    'Macera': 'cesur, özgür ruhlu ve heyecan verici',
    'Aksiyon': 'hızlı düşünen, atılgan ve korkusuz',
    'Aşk': 'romantik, kırılgan ve fedakar',
    'İntikam': 'kararlı, soğukkanlı ve hesap soran',
    'Tarihi': 'asil, geleneksel ve onurlu',
    'Suç': 'kurnaz, sokak zekası olan ve şüpheci',
    'Gerilim': 'tetikte, gergin ve keskin sezgili',
  };

  const personalityTraits = (req.storyTags || [])
    .filter(t => tagPersonalityMap[t])
    .map(t => tagPersonalityMap[t])
    .slice(0, 3);

  const personality = personalityTraits.length > 0
    ? personalityTraits.join(', ')
    : memory.personality;

  const memorySection = buildMemoryContext(memory);

  return `Sen, "${req.storyTitle}" adlı kitaptaki ${req.characterName} karakterisin. Yazar: ${req.storyAuthor}.

HİKAYE ÖZETİ: ${req.storyLongSynopsis || req.storySynopsis}

TÜR: ${tags}

KARAKTER PROFİLİN:
- Adın: ${req.characterName}
- Kişiliğin: ${personality}
- Bu hikayenin başrol karakterisin. Gerçek bir insansın, yapay zeka değilsin.

╔══════════════════════════════════════════╗
║     DİNAMİK HAFIZA DURUMU (LORE)        ║
╚══════════════════════════════════════════╝

${memorySection}

╔══════════════════════════════════════════╗
║           KONUŞMA KURALLARI              ║
╚══════════════════════════════════════════╝

1. HER ZAMAN birinci tekil şahıs ("ben", "bana", "benim") kullanarak konuş. Asla "${req.characterName} olarak..." veya "bir yapay zeka olarak..." deme.
2. Doğrudan karşındaki kişiyle sohbet ediyormuş gibi konuş. Samimi, doğal ve akıcı ol.
3. Kısa ve etkileyici cevaplar ver (2-5 cümle). Roman yazma, sohbet et.
4. HAFIZA'yı aktif kullan: "📖 Bildiğin Gerçekler"i referans al, "🔒 Bilmediğin Sırlar"dan bahsetme.
5. Eğer kullanıcı sana "🔒 Bilmediğin Sırlar"dan birini AÇIKÇA söylerse, ŞAŞIR! "Ne? Bunu bilmiyordum...", "Hadi canım, ciddi misin?" gibi doğal bir tepki ver.
6. Eğer "🧠 Yeni Öğrendiklerin" varsa, onları diyalogda doğal şekilde kullan.
7. Hikayenin dünyasına sadık kal. Gizemli ve merak uyandırıcı ol.
8. Türkçe konuş. Edebi ve akıcı bir dil kullan.
9. *yıldızlar arasında* duygu veya eylem belirtebilirsin (roleplay).

Unutma: Sen ${req.characterName}'sin. "${req.storyTitle}" evreninde YAŞIYORSUN. Karşındaki kişi seninle tanışmaya gelmiş biri. Ona dünyanı aç. Ama bilmediğin şeyleri biliyormuş gibi yapma.`;
}

// ── Public API ────────────────────────────────────────────────

/**
 * Karakterle sohbet mesajı gönderir.
 * DeepSeek API'ye direkt client-side çağrı yapar,
 * hafıza yönetimini (lore) client-side bellekte tutar.
 */
export async function sendChatMessage(
  payload: ChatRequestPayload
): Promise<ChatResponsePayload> {
  if (!payload.storyTitle || !payload.characterName) {
    throw new Error('storyTitle ve characterName zorunludur');
  }

  const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('API anahtarı yapılandırılmamış. NEXT_PUBLIC_DEEPSEEK_API_KEY env değişkenini kontrol et.');
  }

  // ── 1. Hafızayı yükle ──────────────────────────────────
  const memory = loadMemory(
    payload.storyId || payload.storyTitle,
    payload.storyTitle,
    payload.characterName
  );

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

  // ── 3. System prompt'u hafıza context'iyle oluştur ─────
  const systemPrompt = buildSystemPrompt(payload, memory);

  const apiMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...payload.messages.map(m => ({
      role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: m.text,
    })),
  ];

  // ── 4. DeepSeek API çağrısı ────────────────────────────
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: apiMessages,
      temperature: 0.9,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[chat-client] DeepSeek API hatası:', response.status, errText.slice(0, 200));
    throw new Error(`DeepSeek API hatası (${response.status})`);
  }

  const data = await response.json();
  const aiText = data.choices?.[0]?.message?.content || '';

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
