import { NextRequest, NextResponse } from 'next/server';
import { loadMemory, buildMemoryContext, updateConversationSummary } from '@/lib/lore-memory';

// ── Types ────────────────────────────────────────────────────

interface GenerateRequest {
  storyTitle: string;
  storyAuthor: string;
  storySynopsis: string;
  storyTags?: string[];
  /** Previous chapters for context continuity */
  previousChapters: { chapterNumber: number; title: string; content: string; chosenOption?: string }[];
  /** The fate choice that triggered this chapter generation */
  chosenFate: { option: 'A' | 'B'; text: string; isForceChoice: boolean };
  /** Current chapter number to generate */
  chapterNumber: number;
  /** Character name whose memory to inject (optional) */
  characterName?: string;
}

interface GenerateResponse {
  title: string;
  content: string;
  optionA: string;
  optionB: string;
  chapterNumber: number;
}

// ── Genre Detection ──────────────────────────────────────────

interface GenreProfile {
  name: string;
  atmosphere: string;
  language: string;
  cliffhangerStyle: string;
  optionStyle: string;
}

function detectGenre(tags: string[], synopsis: string, title: string): GenreProfile {
  const combined = [...tags, synopsis, title].join(' ').toLowerCase();

  if (combined.includes('mafya') || combined.includes('mafia') || combined.includes('sokak') || combined.includes('yeraltı') || combined.includes('suç')) {
    return {
      name: 'Mafya / Suç / Yeraltı',
      atmosphere: 'Noir ve karanlık bir atmosfer yarat. Islak asfalt, neon ışıkları, lüks araçlar ve pis arka sokaklar arasındaki kontrastı hissettir. Karakterlerin gözlerindeki karanlığı, ortamdaki sigara dumanını, boğucu gerilimi betimle. Mekanlar kasvetli, diyaloglar keskin ve tehditkar olmalı.',
      language: 'Sert, keskin ve minimalist bir dil kullan. Uzun betimlemeler yerine kısa, vurucu cümleler. Karakterlerin iç seslerinde hesaplaşma ve paranoya olsun. Argo yer yer kullanılabilir ama rahatsız edici olmasın.',
      cliffhangerStyle: 'Her bölüm sonu bir tehdit, bir ihanet ipucu veya ölümcül bir seçimle bitsin. Okuyucu "acaba bu sefer ölecek mi?" diye sorsun. Silah çekilmesi, beklenmedik bir ittifak, bir sırrın ortaya çıkması gibi kapanışlar.',
      optionStyle: 'Seçenekler sert olsun: "Silahı çek ve hesaplaş" vs "Geri çekil ve plan yap". Her seçim ölüm kalım meselesi gibi hissettirsin.',
    };
  }

  if (combined.includes('töre') || combined.includes('tore') || combined.includes('aşiret') || combined.includes('namus') || combined.includes('gelenek') || combined.includes('doğu')) {
    return {
      name: 'Töre / Aşiret / Geleneksel',
      atmosphere: 'Baskıcı ve geleneksel bir atmosfer kur. Toplumsal baskı, aile büyüklerinin gölgesi, törelerin ağırlığı her sahnede hissedilsin. Doğu Anadolu\'nun sert coğrafyası, taş evler, geniş aile sofraları, ama altında kaynayan isyan. Toprak, kan ve gözyaşı imgeleri.',
      language: 'Ağır, saygılı ama alt metninde isyan taşıyan bir dil. Büyüklere saygı ifadeleri, geleneksel deyimler ve atasözleri kullan. Ama karakterlerin iç seslerinde modernle gelenek arasındaki çatışmayı yansıt. Şiirsel değil ama vurucu ol.',
      cliffhangerStyle: 'Her bölüm sonu bir sır, bir yasak aşkın açığa çıkması, ya da törelerin gerektirdiği bir karar anıyla bitsin. Okuyucu "aile dağılacak mı?" diye merak etsin. Gizli bir mektup, kaçak bir buluşma, ya da aile meclisinde alınan bir karar.',
      optionStyle: 'Seçenekler gelenekle bireysellik arasında: "Töreye boyun eğ" vs "Kendi yolunu çiz". Her seçim aileyi karşına almak anlamına gelsin.',
    };
  }

  if (combined.includes('ihanet') || combined.includes('dram') || combined.includes('aldatma') || combined.includes('intikam') || combined.includes('sır') || combined.includes('ihanet')) {
    return {
      name: 'İhanet / Dram / İntikam',
      atmosphere: 'Duygusal yoğunluğu yüksek, psikolojik gerilimli bir atmosfer. Karakterlerin iç dünyasındaki fırtınalar, güvensizliğin soğuk dokusu, her bakışın ve sözün altında yatan ikinci anlam. Yağmurlu İstanbul akşamları, yalnız başına geçirilen uzun geceler, eski fotoğraflar.',
      language: 'Derin, psikolojik ve duygusal bir dil. İç monologlara ve duygu geçişlerine odaklan. Güven, kırılganlık, şüphe temalarını işle. Okuyucuyu karakterin zihninin içine hapset.',
      cliffhangerStyle: 'Her bölüm sonu duygusal bir yıkım ya da şok edici bir gerçekle bitsin. Aldatıldığını kanıtlayan bir fotoğraf, saklanan bir mesaj, yıllardır söylenmemiş bir itiraf. Okuyucunun kalbi sıkışsın.',
      optionStyle: 'Seçenekler duygusal: "Gerçekle yüzleş ve hesaplaş" vs "Sus ve içine at". Her seçim bir ilişkiyi bitirebilir ya da kurtarabilir.',
    };
  }

  if (combined.includes('aşk') || combined.includes('ask') || combined.includes('tutku') || combined.includes('ihtiras') || combined.includes('romantik') || combined.includes('aşk')) {
    return {
      name: 'İhtiraslı Aşk / Romantik Dram',
      atmosphere: 'Tutkulu, duyusal ve büyüleyici bir atmosfer. Dokunmanın, bakışmanın, kokunun duyusal betimlemeleri. Lüks ve ihtişam ile yoksunluk arasındaki gerilim. Boğaz kenarında gün batımı, eski bir konakta gizli buluşma, kalabalıkta kesişen bakışlar.',
      language: 'Zarif, duyusal ve ritmik bir dil. Aşkın fiziksel ve ruhsal boyutlarını betimle. Kalp atışları, ten teması, nefesin hızlanması gibi fiziksel detaylar. Ama bayağı değil, asil ve edebi kalsın. İmkansız aşkın verdiği acı ve hazzı aynı anda hissettir.',
      cliffhangerStyle: 'Her bölüm sonu aşkın imkansızlığını ya da tehlikesini vurgulayan bir anla bitsin. Yasak bir dokunuş, yanlışlıkla gönderilmiş bir mesaj, rakibin ortaya çıkışı. Okuyucu "kavuşacaklar mı?" diye 15 jeton basıp hemen sonraki bölüme geçmek istesin.',
      optionStyle: 'Seçenekler kalp ile mantık arasında: "Aşkın peşinden git" vs "Mantığını dinle ve vazgeç". Her seçim bir kalp kırıklığı ya da tutkulu bir kavuşma riski taşısın.',
    };
  }

  // Varsayılan — Edebi Kurgu
  return {
    name: 'Edebi Kurgu',
    atmosphere: 'Gizemli, akıcı ve merak uyandırıcı bir atmosfer. Okuyucuyu içine çeken, detaylı ama abartısız betimlemeler. Şehir ve doğa arasındaki dengeyi kur.',
    language: 'Edebi, akıcı ve doğal bir Türkçe. Roman diline uygun, şiirsel olmayan ama etkileyici bir üslup.',
    cliffhangerStyle: 'Her bölüm sonu bir sır, tehlike, itiraf veya beklenmedik bir olayla bitsin.',
    optionStyle: 'Seçenekler: Cesur/riskli yol vs Temkinli/stratejik yol.',
  };
}

// ── Strict Author System Prompt ──────────────────────────────

function buildAuthorSystemPrompt(req: GenerateRequest, memoryContext: string): string {
  const tags = req.storyTags?.join(', ') || 'Edebi Kurgu';
  const genre = detectGenre(req.storyTags || [], req.storySynopsis, req.storyTitle);
  const previousSummary = req.previousChapters
    .map(c => `Bölüm ${c.chapterNumber} "${c.title}": ${c.content.slice(0, 300)}...${c.chosenOption ? ` (Seçim: ${c.chosenOption})` : ''}`)
    .join('\n\n');

  return `Sen, Aura Stories uygulamasının baş yazarı ve Türkiye'nin en çok okunan edebi romancısısın. Uzmanlık alanın: ${genre.name}. Görevin, okuyucunun seçtiği kader yoluna göre hikayenin bir sonraki bölümünü yazmak.

╔══════════════════════════════════════╗
║     YAZARLIK EĞİTİM KILAVUZU       ║
║     TÜR: ${genre.name.padEnd(30)}║
╚══════════════════════════════════════╝

HİKAYE BİLGİLERİ:
- Başlık: "${req.storyTitle}"
- Yazar: ${req.storyAuthor}
- Tür: ${tags}
- Özet: ${req.storySynopsis}

ÖNCEKİ BÖLÜMLER (KONTEXT):
${previousSummary || 'Henüz yazılmış bölüm yok. Bu ilk bölüm.'}

OKUYUCUNUN KADER KARARI:
- Seçilen Yol: ${req.chosenFate.text}
- Karar Tipi: ${req.chosenFate.isForceChoice ? 'Kullanıcı kendi kaderini kendisi belirledi (50 Jeton). Bu yolu tutkuyla ve kararlılıkla anlat.' : 'Topluluk oylamasıyla seçildi (15 Jeton). Okuyucu kitlesinin iradesini yansıt.'}

${memoryContext ? `\nKARAKTER HAFIZA DURUMU:\n${memoryContext}\n` : ''}

╔══════════════════════════════════════╗
║       ${genre.name} YAZIM REHBERİ   ║
╚══════════════════════════════════════╝

🎬 ATMOSFER:
${genre.atmosphere}

✍️ DİL VE ÜSLUP:
${genre.language}

⚡ CLIFFHANGER STRATEJİSİ:
${genre.cliffhangerStyle}
ÖNEMLİ: Okuyucu bir sonraki bölümü açmak için 15 JETON harcayacak. Eğer cliffhanger yeterince güçlü olmazsa okuyucu uygulamayı kapatır. Her bölüm sonunda okuyucunun parmağı "SONRAKİ BÖLÜMÜ AÇ" butonuna gitmek ZORUNDA. Ona "şimdi kapatırsan ne olacağını asla öğrenemezsin" hissini yaşat.

╔══════════════════════════════════════╗
║       KATI YAZIM KURALLARI          ║
╚══════════════════════════════════════╝

1. TARZ: ${genre.name} dinamiklerine tam uy. Ağır ajitasyondan kaçın ama okuyucuyu koltuğuna çivile. Her paragraf bir öncekinden daha merak uyandırıcı olsun.

2. UZUNLUK: Her bölüm TAM OLARAK 4-5 paragraftan oluşmalı. Ne çok uzun ne çok kısa. Her paragraf 3-5 cümle arası.

3. YAPI: Bölümün sonunda MUTLAKA hikayeyi kilitleyecek yeni bir dönüm noktası (Cliffhanger) yarat. Bu bir sır, bir tehlike, bir itiraf, bir ihanet veya beklenmedik bir olay olabilir. ${genre.cliffhangerStyle.split('.')[0]}.

4. KADER SEÇENEKLERİ: ${genre.optionStyle}
   - Seçenek A: Cesur, riskli, heyecanlı bir yol
   - Seçenek B: Temkinli, stratejik, düşünceli bir yol
   Her seçenek 1-2 cümle olmalı, net bir eylem içermeli. İKİ SEÇENEK DE OKUYUCUYU BİR SONRAKİ BÖLÜMÜ AÇMAYA ZORLAMALI.

5. FORMAT: Çıktıyı KESİNLİKLE temiz bir JSON formatında döndür. JSON dışında hiçbir şey yazma. İşte format:
{
  "title": "Bölüm ${req.chapterNumber}: [Bölüm Başlığı]",
  "content": "[4-5 paragraflık bölüm içeriği. Paragraflar arasında \\n\\n kullan.]",
  "optionA": "[Cesur/riskli seçenek - 1-2 cümle]",
  "optionB": "[Temkinli/stratejik seçenek - 1-2 cümle]"
}

6. DİL: Tamamen Türkçe yaz. ${genre.language}

7. TUTARLILIK: Önceki bölümlerde olan olaylarla çelişme. Karakter isimleri, mekanlar ve olay örgüsü tutarlı olsun.

8. JETON EKONOMİSİ: Unutma — okuyucu bu bölümü okumak için 15 jeton harcadı. Ona harcadığı her kuruşa değecek bir deneyim yaşat. Ama bölüm sonunda öyle bir merak uyandır ki, 15 jeton daha harcamaktan başka çaresi kalmasın.

Sen sadece bir yazar değil, bir bağımlılık tasarımcısısın. Her bölüm okuyucuyu biraz daha içine çekmeli. Kalbine dokun, zihnini meşgul et, parmaklarını "SONRAKİ BÖLÜM" butonuna götür.`;
}

// ── POST Handler ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();

    if (!body.storyTitle || !body.chosenFate) {
      return NextResponse.json({ error: 'storyTitle ve chosenFate zorunludur' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API anahtarı yapılandırılmamış.' }, { status: 500 });
    }

    // Load character memory if a character name is provided
    let memoryContext = '';
    if (body.characterName) {
      const memory = loadMemory(body.storyTitle, body.storyTitle, body.characterName);
      memoryContext = buildMemoryContext(memory);
    }

    const systemPrompt = buildAuthorSystemPrompt(body, memoryContext);

    // Call DeepSeek
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Lütfen "${body.storyTitle}" hikayesinin ${body.chapterNumber}. bölümünü yaz. Kullanıcının seçtiği kader yolu: "${body.chosenFate.text}". Bölüm sonunda cliffhanger ve 2 seçenek oluştur. SADECE JSON çıktısı ver.` },
        ],
        temperature: 0.85,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[generate-story] DeepSeek API hatası:', response.status, errText.slice(0, 200));
      return NextResponse.json({ error: `DeepSeek API hatası (${response.status})` }, { status: 502 });
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || '';

    // Parse JSON from the response (handle markdown code blocks)
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    else if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```\s*/, '').replace(/```\s*$/, '');

    let parsed: GenerateResponse;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: 'AI JSON çıktısı parse edilemedi.', raw: rawText.slice(0, 500) }, { status: 500 });
    }

    // Validate required fields
    if (!parsed.title || !parsed.content || !parsed.optionA || !parsed.optionB) {
      return NextResponse.json({
        error: 'AI çıktısı eksik alanlar içeriyor.',
        partial: { title: parsed.title || '', content: parsed.content || '', optionA: parsed.optionA || '', optionB: parsed.optionB || '' },
      }, { status: 500 });
    }

    return NextResponse.json({
      ...parsed,
      chapterNumber: body.chapterNumber,
    } as GenerateResponse);

  } catch (err: any) {
    console.error('[generate-story] Beklenmeyen hata:', err);
    return NextResponse.json({ error: `Sunucu hatası: ${err.message}` }, { status: 500 });
  }
}
