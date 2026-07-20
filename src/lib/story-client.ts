/**
 * Client-side AI Story Generation Module
 *
 * Statik export (output: 'export') ile uyumlu olması için
 * DeepSeek API çağrısı client-side'a taşındı — chat-client.ts'teki
 * aynı desen. Eski API route: src/app/api/generate-story/route.ts
 */

// ── Types ────────────────────────────────────────────────────

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export interface PreviousChapter {
  chapterNumber: number;
  title: string;
  content: string;
  chosenOption?: string;
}

export interface GenerateStoryPayload {
  storyTitle: string;
  storyAuthor: string;
  storySynopsis: string;
  storyTags?: string[];
  previousChapters: PreviousChapter[];
  chosenFate: { option: 'A' | 'B'; text: string; isForceChoice: boolean };
  chapterNumber: number;
}

export interface GenerateStoryResult {
  title: string;
  content: string;
  optionA: string;
  optionB: string;
}

// ── Genre-specific Narrative Style ──────────────────────────────

const tagNarrativeStyleMap: Record<string, string> = {
  'Romantik': 'duygusal, akıcı ve tutkulu',
  'Mafya': 'sert, gerilimli ve karanlık',
  'Dram': 'derin, melankolik ve içe dönük',
  'Fantastik': 'büyülü, atmosferik ve gizemli',
  'Gizem': 'meraklandıran, ipuçlarıyla dolu',
  'Macera': 'hızlı tempolu ve heyecan verici',
  'Aksiyon': 'nefes kesici ve sahne odaklı',
  'Aşk': 'romantik ve kırılgan duygularla dolu',
  'İntikam': 'gergin ve hesaplaşma dolu',
  'Tarihi': 'dönem atmosferine sadık ve asil',
  'Suç': 'sokak diliyle harmanlanmış ve kurnaz',
  'Gerilim': 'tetikte tutan ve gergin',
};

function buildSystemPrompt(payload: GenerateStoryPayload): string {
  const tags = payload.storyTags?.join(', ') || 'kurgu';

  const styleTraits = (payload.storyTags || [])
    .filter(t => tagNarrativeStyleMap[t])
    .map(t => tagNarrativeStyleMap[t])
    .slice(0, 3);

  const style = styleTraits.length > 0 ? styleTraits.join(', ') : 'akıcı ve sürükleyici';

  const recentChapters = payload.previousChapters.slice(-3);
  const chaptersSection = recentChapters.length > 0
    ? recentChapters
        .map(ch => `Bölüm ${ch.chapterNumber} — ${ch.title}\n${ch.content}${ch.chosenOption ? `\n(Okuyucunun seçimi: ${ch.chosenOption})` : ''}`)
        .join('\n\n')
    : '(Bu ilk bölüm — henüz önceki bölüm yok.)';

  return `Sen, "${payload.storyTitle}" adlı interaktif hikayenin AI anlatıcısısın. Yazar: ${payload.storyAuthor}.

HİKAYE ÖZETİ: ${payload.storySynopsis}

TÜR: ${tags}
ANLATIM TARZI: ${style}

╔══════════════════════════════════════════╗
║           ÖNCEKİ BÖLÜMLER                ║
╚══════════════════════════════════════════╝

${chaptersSection}

╔══════════════════════════════════════════╗
║           OKUYUCUNUN KADER SEÇİMİ        ║
╚══════════════════════════════════════════╝

Okuyucu şu seçimi yaptı: "${payload.chosenFate.text}"${payload.chosenFate.isForceChoice ? ' (kaderini zorla belirledi)' : ''}

╔══════════════════════════════════════════╗
║           GÖREV                          ║
╚══════════════════════════════════════════╝

Bölüm ${payload.chapterNumber}'i yaz. Kurallar:
1. Okuyucunun seçimini doğrudan sonuçlandırarak başla, hikayeyi o yönde ilerlet.
2. ${style} bir anlatımla, üçüncü tekil şahıs anlatı kullan.
3. Türkçe, edebi ve akıcı bir dil kullan. 350-550 kelime uzunluğunda yaz.
4. Önceki bölümlerdeki karakterlere, olaylara ve tutarlılığa sadık kal.
5. Bölümü bir gerilim/merak anında bitir — okuyucu bir sonraki kararı vermek istesin.
6. Bölümden sonra okuyucuya sunulacak İKİ farklı kader seçeneği yaz (A ve B) — kısa, çarpıcı, birbirinden belirgin şekilde farklı yönlere işaret eden cümleler.

Yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir açıklama ekleme:
{"title": "Bölüm başlığı", "content": "Bölüm metni", "optionA": "A seçeneği metni", "optionB": "B seçeneği metni"}`;
}

// ── Response Parsing ─────────────────────────────────────────

function parseStoryResponse(raw: string): GenerateStoryResult {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('AI yanıtı geçerli JSON formatında değil.');
  }

  if (!parsed.title || !parsed.content || !parsed.optionA || !parsed.optionB) {
    throw new Error('AI yanıtında eksik alan var (title/content/optionA/optionB).');
  }

  return {
    title: String(parsed.title),
    content: String(parsed.content),
    optionA: String(parsed.optionA),
    optionB: String(parsed.optionB),
  };
}

// ── Public API ────────────────────────────────────────────────

/**
 * Bir sonraki hikaye bölümünü üretir.
 * DeepSeek API'ye direkt client-side çağrı yapar.
 */
export async function generateStoryChapter(
  payload: GenerateStoryPayload,
  timeoutMs: number = 20000
): Promise<GenerateStoryResult> {
  if (!payload.storyTitle || !payload.chosenFate) {
    throw new Error('storyTitle ve chosenFate zorunludur');
  }

  const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('API anahtarı yapılandırılmamış. NEXT_PUBLIC_DEEPSEEK_API_KEY env değişkenini kontrol et.');
  }

  const systemPrompt = buildSystemPrompt(payload);
  const apiMessages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: apiMessages,
        temperature: 0.9,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error('[story-client] DeepSeek API hatası:', response.status, errText.slice(0, 200));
    throw new Error(`DeepSeek API hatası (${response.status})`);
  }

  const data = await response.json();
  const aiText = data.choices?.[0]?.message?.content || '';

  if (!aiText) {
    throw new Error('AI yanıt üretemedi.');
  }

  return parseStoryResponse(aiText);
}
