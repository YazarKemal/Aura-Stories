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

export interface CharacterKnowledge {
  characterName: string;
  learnedFacts: string[];
}

export interface GenerateStoryPayload {
  storyTitle: string;
  storyAuthor: string;
  storySynopsis: string;
  storyTags?: string[];
  previousChapters: PreviousChapter[];
  chosenFate: { option: 'A' | 'B'; text: string; isForceChoice: boolean };
  chapterNumber: number;
  /** Karakterlerin sohbet ekranında öğrendiği gerçekler — tutarlılık için */
  characterKnowledge?: CharacterKnowledge[];
  /** Hikayede zaten tanıtılmış karakterlerin adları — yeni karakter tespiti için */
  existingCharacterNames?: string[];
}

export interface NewCharacter {
  name: string;
  role: string;
  personality: string;
  greeting: string;
}

export interface GenerateStoryResult {
  title: string;
  content: string;
  optionA: string;
  optionB: string;
  /** Bu bölümün hikayenin/karakterlerin duygusal tonunda yarattığı değişimin kısa özeti */
  emotionalShift?: string;
  /** Bu bölümde ilk kez tanıtılan, daha önce bahsi geçmemiş karakterler */
  newCharacters?: NewCharacter[];
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

  const knowledge = payload.characterKnowledge?.filter(k => k.learnedFacts.length > 0) || [];
  const knowledgeSection = knowledge.length > 0
    ? `\n╔══════════════════════════════════════════╗\n║  KARAKTERLERİN SOHBETTE ÖĞRENDİKLERİ     ║\n╚══════════════════════════════════════════╝\n\n${knowledge
        .map(k => `${k.characterName}: ${k.learnedFacts.map(f => `"${f}"`).join('; ')}`)
        .join('\n')}\n\nBu bölümü yazarken bu karakterlerin artık bu gerçekleri BİLDİĞİNİ varsay — sohbette zaten ifşa edilmiş bu bilgilerle çelişme.\n`
    : '';

  const existingNames = payload.existingCharacterNames?.join(', ') || '(henüz karakter tanıtılmadı)';

  return `Sen, "${payload.storyTitle}" adlı interaktif hikayenin AI anlatıcısısın. Yazar: ${payload.storyAuthor}.

HİKAYE ÖZETİ: ${payload.storySynopsis}

TÜR: ${tags}
ANLATIM TARZI: ${style}

╔══════════════════════════════════════════╗
║           ÖNCEKİ BÖLÜMLER                ║
╚══════════════════════════════════════════╝

${chaptersSection}
${knowledgeSection}
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
7. Bu bölümde karakterlerin duygusal durumunda bir değişim varsa (ör. ihanet, zafer, kayıp, güven), bunu TEK CÜMLEYLE özetle (emotionalShift). Belirgin bir değişim yoksa emotionalShift'i boş string bırak.
8. Hikayede zaten tanıtılmış karakterler: ${existingNames}. Eğer bu bölümde bunların DIŞINDA, isimlendirilmiş ve konuşan YENİ bir karakter tanıtırsan, onu newCharacters dizisine ekle (name, role, personality, greeting — greeting o karakterin ağzından, birinci tekil şahıs bir selamlama cümlesi olsun). Yeni karakter yoksa newCharacters'i boş dizi bırak. Var olan karakterleri asla tekrar ekleme.

Yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir açıklama ekleme:
{"title": "Bölüm başlığı", "content": "Bölüm metni", "optionA": "A seçeneği metni", "optionB": "B seçeneği metni", "emotionalShift": "Tek cümlelik duygusal durum özeti veya boş string", "newCharacters": [{"name": "...", "role": "...", "personality": "...", "greeting": "..."}]}`;
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

  const newCharacters: NewCharacter[] = Array.isArray(parsed.newCharacters)
    ? parsed.newCharacters
        .filter((c: any) => c && c.name && c.role && c.personality && c.greeting)
        .map((c: any) => ({
          name: String(c.name),
          role: String(c.role),
          personality: String(c.personality),
          greeting: String(c.greeting),
        }))
    : [];

  return {
    title: String(parsed.title),
    content: String(parsed.content),
    optionA: String(parsed.optionA),
    optionB: String(parsed.optionB),
    emotionalShift: parsed.emotionalShift ? String(parsed.emotionalShift) : undefined,
    newCharacters: newCharacters.length > 0 ? newCharacters : undefined,
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
