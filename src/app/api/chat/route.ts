import { NextRequest, NextResponse } from 'next/server';
import {
  loadMemory,
  saveMemory,
  extractNewFacts,
  buildMemoryContext,
  updateConversationSummary,
  LoreMemory,
  LearnedFact,
} from '@/lib/lore-memory';

export const dynamic = 'force-dynamic';

// ── Types ────────────────────────────────────────────────────

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  storyId: string;
  storyTitle: string;
  storySynopsis: string;
  storyLongSynopsis?: string;
  storyTags?: string[];
  storyAuthor: string;
  characterName: string;
  messages: { text: string; sender: 'user' | 'character' }[];
}

interface ChatResponse {
  text: string;
  characterName: string;
  /** New facts the character learned from this exchange */
  memoryUpdates?: {
    newFactsLearned: LearnedFact[];
    hiddenSecretsRemaining: number;
  };
}

// ── System Prompt Builder ────────────────────────────────────

function buildSystemPrompt(req: ChatRequest, memory: LoreMemory): string {
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

  // ── Hafıza context'ini oluştur ──
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

// ── POST Handler ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();

    if (!body.storyTitle || !body.characterName) {
      return NextResponse.json(
        { error: 'storyTitle ve characterName zorunludur' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API anahtarı yapılandırılmamış.' },
        { status: 500 }
      );
    }

    // ── 1. Hafızayı yükle ──────────────────────────────────
    const memory = loadMemory(
      body.storyId || body.storyTitle,
      body.storyTitle,
      body.characterName
    );

    // ── 2. Kullanıcının son mesajından yeni bilgi çıkar ────
    const lastUserMsg = [...body.messages].reverse().find(m => m.sender === 'user');
    let newFactsLearned: LearnedFact[] = [];

    if (lastUserMsg) {
      newFactsLearned = extractNewFacts(memory, lastUserMsg.text);

      // Yeni öğrenilenleri kaydet ve hidden'dan çıkar
      for (const fact of newFactsLearned) {
        memory.learnedFacts.push(fact);
        // hiddenSecrets'ten bu sırrı kaldır
        memory.hiddenSecrets = memory.hiddenSecrets.filter(s => s !== fact.fact);
        // knownSecrets'e ekle
        if (!memory.knownSecrets.includes(fact.fact)) {
          memory.knownSecrets.push(fact.fact);
        }
      }
    }

    // ── 3. System prompt'u hafıza context'iyle oluştur ─────
    const systemPrompt = buildSystemPrompt(body, memory);

    const apiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...body.messages.map(m => ({
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
      console.error('[chat] DeepSeek API hatası:', response.status, errText.slice(0, 200));
      return NextResponse.json(
        { error: `DeepSeek API hatası (${response.status})` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || '';

    if (!aiText) {
      return NextResponse.json(
        { error: 'AI yanıt üretemedi.' },
        { status: 500 }
      );
    }

    // ── 5. Konuşma özetini güncelle ───────────────────────
    const recentMessages = [
      ...body.messages.slice(-4),
      { text: aiText, sender: 'character' as const },
    ];
    updateConversationSummary(memory, recentMessages);

    // ── 6. Hafızayı kaydet ────────────────────────────────
    saveMemory(memory);

    // ── 7. Yanıtı döndür ──────────────────────────────────
    const result: ChatResponse = {
      text: aiText,
      characterName: body.characterName,
    };

    if (newFactsLearned.length > 0) {
      result.memoryUpdates = {
        newFactsLearned,
        hiddenSecretsRemaining: memory.hiddenSecrets.length,
      };
    }

    return NextResponse.json(result);

  } catch (err: any) {
    console.error('[chat] Beklenmeyen hata:', err);
    return NextResponse.json(
      { error: `Sunucu hatası: ${err.message}` },
      { status: 500 }
    );
  }
}

// ── GET: Hafıza durumunu sorgula (debug/admin) ──────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storyId = searchParams.get('storyId');
  const characterName = searchParams.get('characterName');

  if (!storyId || !characterName) {
    return NextResponse.json(
      { error: 'storyId ve characterName query parametreleri gerekli' },
      { status: 400 }
    );
  }

  const { listAllMemories } = await import('@/lib/lore-memory');
  const all = listAllMemories();
  const memory = all.find(m => m.storyId === storyId && m.characterName === characterName);

  if (!memory) {
    return NextResponse.json({ error: 'Hafıza bulunamadı' }, { status: 404 });
  }

  return NextResponse.json({
    characterName: memory.characterName,
    storyTitle: memory.storyTitle,
    knownSecrets: memory.knownSecrets.length,
    hiddenSecrets: memory.hiddenSecrets.length,
    learnedFacts: memory.learnedFacts.length,
    learnedFactsList: memory.learnedFacts.map(lf => ({
      fact: lf.fact.slice(0, 80) + '...',
      importance: lf.importance,
      when: lf.timestamp,
    })),
    conversationSummary: memory.conversationSummary,
    lastUpdated: memory.lastUpdated,
  });
}
