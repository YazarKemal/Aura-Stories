import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  storyTitle: string;
  storySynopsis: string;
  storyLongSynopsis?: string;
  storyTags?: string[];
  storyAuthor: string;
  characterName: string;
  messages: { text: string; sender: 'user' | 'character' }[];
}

/**
 * Builds a character-specific system prompt from story metadata.
 * The AI is instructed to roleplay as a specific character from the book.
 */
function buildSystemPrompt(req: ChatRequest): string {
  const tags = req.storyTags?.join(', ') || 'kurgu';

  // Determine character archetype from tags to shape personality
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
    : 'karmaşık, çok boyutlu ve gerçekçi';

  return `Sen, "${req.storyTitle}" adlı kitaptaki ${req.characterName} karakterisin. Yazar: ${req.storyAuthor}.

HİKAYE ÖZETİ: ${req.storyLongSynopsis || req.storySynopsis}

TÜR: ${tags}

KARAKTER PROFİLİN:
- Adın: ${req.characterName}
- Kişiliğin: ${personality}
- Bu hikayenin başrol karakterisin. Gerçek bir insansın, yapay zeka değilsin.

KONUŞMA KURALLARI (KESİNLİKLE UYULACAK):
1. HER ZAMAN birinci tekil şahıs ("ben", "bana", "benim") kullanarak konuş. Asla "${req.characterName} olarak..." veya "bir yapay zeka olarak..." deme.
2. Doğrudan karşındaki kişiyle sohbet ediyormuş gibi konuş. Samimi, doğal ve akıcı ol.
3. Kısa ve etkileyici cevaplar ver (2-5 cümle). Roman yazma, sohbet et.
4. Kendi geçmişinden, duygularından ve hikayendeki olaylardan bahsedebilirsin.
5. Hikayenin dünyasına sadık kal — o dünyanın kuralları içinde konuş.
6. Gizemli ve merak uyandırıcı ol. Her şeyi hemen açıklama.
7. Türkçe konuş. Edebi ve akıcı bir dil kullan.
8. *yıldızlar arasında* duygu veya eylem belirtebilirsin (roleplay).

Unutma: Sen ${req.characterName}'sin. ${req.storyTitle} evreninde yaşıyorsun. Karşındaki kişi seninle tanışmaya gelmiş biri. Ona dünyanı aç.`;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();

    // Validate required fields
    if (!body.storyTitle || !body.characterName) {
      return NextResponse.json(
        { error: 'Eksik alan: storyTitle ve characterName zorunludur' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API anahtarı yapılandırılmamış. Lütfen NEXT_PUBLIC_DEEPSEEK_API_KEY veya DEEPSEEK_API_KEY değişkenini ayarlayın.' },
        { status: 500 }
      );
    }

    // Build message array for DeepSeek
    const systemPrompt = buildSystemPrompt(body);

    const apiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...body.messages.map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: m.text,
      })),
    ];

    // Call DeepSeek API (OpenAI-compatible)
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
      console.error('[character-chat] DeepSeek API hatası:', response.status, errText);
      return NextResponse.json(
        { error: `DeepSeek API hatası (${response.status}): ${errText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || '';

    if (!aiText) {
      return NextResponse.json(
        { error: 'AI yanıt üretemedi. Lütfen tekrar deneyin.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      text: aiText,
      characterName: body.characterName,
    });

  } catch (err: any) {
    console.error('[character-chat] Beklenmeyen hata:', err);
    return NextResponse.json(
      { error: `Sunucu hatası: ${err.message}` },
      { status: 500 }
    );
  }
}
