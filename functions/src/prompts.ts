/**
 * Prompt build helpers — Firebase Functions tarafı.
 *
 * TÜM system prompt'lar SUNUCU TARAFINDAN güvenilir alanlardan oluşturulur.
 * İstemci HAM system prompt, model, temperature, max_tokens veya
 * API endpoint parametresi GÖNDEREMEZ.
 *
 * BU DOSYADA API ANAHTARI VEYA SECRET BULUNMAZ.
 */
import type { GenerateStoryInput, CharacterChatInput } from './types';
import { buildAuraStyleGuide } from './story-style';

// ── Story Generation Prompt ─────────────────────────────────────

function buildContinuitySection(input: GenerateStoryInput): string {
  const recentChapters = input.previousChapters.slice(-4);
  if (recentChapters.length === 0) {
    return '(Bu ilk üretilen bölüm. Hikâye özeti, karakter ilişkileri ve okuyucunun seçimi ana süreklilik kaynağıdır.)';
  }

  return recentChapters
    .map(ch => {
      const chosen = ch.chosenOption ? `\nOkuyucunun önceki seçimi: ${ch.chosenOption}` : '';
      return `Bölüm ${ch.chapterNumber} — ${ch.title}\n${ch.content.slice(0, 3600)}${chosen}`;
    })
    .join('\n\n');
}

/**
 * Story generation için DeepSeek system prompt'unu oluşturur.
 * Aura'nın seri-kurgu dilini tek bir "edebi" sıfata bırakmak yerine
 * tempo, alt metin, paragraf ritmi, devamlılık ve cliffhanger kurallarıyla
 * sunucu tarafında standardize eder.
 */
export function buildStoryPrompt(input: GenerateStoryInput): string {
  const tags = input.storyTags?.join(', ') || 'Kurgu';
  const styleGuide = buildAuraStyleGuide(input);
  const continuity = buildContinuitySection(input);

  return `Sen Aura Stories'in kıdemli seri-kurgu yazarısın. Görevin yalnızca metin üretmek değil; mobilde bölüm bölüm okunan, seçimlerle dallanan ve karakter tutarlılığını koruyan yüksek kaliteli bir hikâye bölümü yazmaktır.

HİKÂYE
Başlık: ${input.storyTitle}
Yazar etiketi: ${input.storyAuthor || 'Anonim'}
Tür/etiketler: ${tags}
Ana özet: ${input.storySynopsis}

${styleGuide}

SÜREKLİLİK KAYDI
${continuity}

OKUYUCU KARARI
"${input.chosenFate.text}"${input.chosenFate.isForceChoice ? ' — okuyucu bu yolu özellikle zorlayarak seçti; bölüm bu kararın bedelini ve sonucunu görünür kılmalı.' : ''}

BÖLÜM ${input.chapterNumber} İÇİN YAZIM PROTOKOLÜ
1. İlk 1-2 paragrafta önceki kararın somut sonucuna gir. Uzun özet veya "önceki bölümde" anlatımı yapma.
2. 420-620 kelime hedefle. 5-9 okunabilir paragraf kullan. Mobil ekranda duvar gibi tek parça metin üretme.
3. Üçüncü tekil şahıs kullan. Bakış açısını bölüm içinde rastgele değiştirme.
4. Her paragrafın bir işi olsun: eylem, yeni bilgi, ilişki gerilimi, karar baskısı veya atmosfer. Aynı hissi tekrar eden paragraf yazma.
5. Diyalog kullanıyorsan karaktere özgü, kısa ve alt metinli olsun. Karakterler birbirlerine zaten bildikleri bilgileri sırf okuyucu öğrensin diye anlatmasın.
6. Duyguları sürekli isimlendirme. "Korktu/üzüldü/çok heyecanlandı" demek yerine davranış, beden dili, seçim ve duyusal ayrıntıyla göster.
7. En fazla 1-2 güçlü benzetme/metafor kullan. Her cümleyi şiirleştirme; akıcılık gösterişten önemli.
8. Önceki bölümlerde kurulmuş isimleri, ilişkileri, sırları ve sonuçları bozma. Bilmediğin yeni bir geçmiş bilgisi gerekiyorsa küçük ve çelişkisiz tut.
9. Bölüm ortasında en az bir mikro-dönüş yarat: yeni ipucu, güç dengesi değişimi, yanlış varsayımın kırılması veya beklenmedik bedel.
10. Son 1-2 paragraf bölümün en güçlü anı olmalı. Yeni bir soru/risk/itiraf/tehdit aç ve hemen ardından seçimlere geç.
11. A ve B seçenekleri gerçek bir ikilem olmalı. Aynı eylemin iki farklı cümlesi olmasın. Her biri farklı bir bedel ve hikâye yönü vaat etsin.
12. Seçenek metinlerini 4-12 kelime arasında, eylem odaklı ve birbirinden belirgin yaz.
13. Klişe seri-kurgu kalıplarını mekanik biçimde kullanma: "kalbi yerinden çıkacak gibiydi", "nefesi kesildi", "zaman durmuştu" gibi ifadeleri tekrarlama.
14. Başlığı kısa, sahneye özgü ve merak uyandırıcı seç; "Yeni Başlangıç", "Kader", "Sırlar" gibi jenerik tek kelimelik başlıklardan kaçın.

SESSİZ KALİTE KONTROLÜ
Yanıtı vermeden önce kendi içinde kontrol et:
- Okuyucu kararının sonucu gerçekten işlendi mi?
- En az bir yeni olay/gerçek oluştu mu?
- Karakter davranışları önceki bölümlerle çelişiyor mu?
- Paragraflar tekrara düşüyor mu?
- Son kanca bir sonraki bölümü gerçekten merak ettiriyor mu?
- A ve B farklı sonuçlar vaat ediyor mu?
Sorun varsa metni sessizce düzelt; kalite kontrol notlarını yanıta yazma.

Yanıtını SADECE geçerli JSON nesnesi olarak ver. Markdown/code fence/açıklama ekleme:
{"title":"Bölüm başlığı","content":"Bölüm metni","optionA":"A seçeneği","optionB":"B seçeneği"}`;
}

// ── Character Chat Prompt ───────────────────────────────────────

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

/** Lore memory context'ini system prompt'a eklenebilir metne dönüştürür */
function buildMemorySection(memory: CharacterChatInput['memoryContext']): string {
  if (!memory) return '';

  const parts: string[] = [];

  if (memory.knownSecrets.length > 0) {
    parts.push('HİKAYENDE BİLDİĞİN GERÇEKLER:');
    for (const s of memory.knownSecrets) parts.push(`- ${s}`);
  }

  if (memory.hiddenSecrets.length > 0) {
    parts.push('');
    parts.push('HENÜZ BİLMEDİĞİN SIRLAR (bunları karakter olarak bilmiyorsun):');
    for (const s of memory.hiddenSecrets) parts.push(`- ${s}`);
    parts.push('Kullanıcı bunlardan birini açıkça söylerse doğal biçimde şaşır ve yeni öğrendiğini belli et.');
  }

  if (memory.learnedFacts.length > 0) {
    parts.push('');
    parts.push('BU SOHBETTE ÖĞRENDİĞİN YENİ BİLGİLER:');
    for (const lf of memory.learnedFacts.slice(-5)) {
      parts.push(`- ${lf.fact} (önem: ${lf.importance})`);
    }
  }

  if (memory.conversationSummary) {
    parts.push('');
    parts.push(`ÖNCEKİ KONUŞMA ÖZETİ: ${memory.conversationSummary}`);
  }

  return parts.length > 0
    ? `\nDİNAMİK HAFIZA DURUMU\n${parts.join('\n')}\n`
    : '';
}

/**
 * Character chat için DeepSeek system prompt'unu SUNUCU TARAFINDA oluşturur.
 * İstemcinin gönderdiği lore memoryContext verisi prompt'a dahil edilir.
 */
export function buildChatPrompt(input: CharacterChatInput): string {
  const tags = input.storyTags?.join(', ') || 'kurgu';

  const personalityTraits = (input.storyTags || [])
    .filter(t => tagPersonalityMap[t])
    .map(t => tagPersonalityMap[t])
    .slice(0, 3);

  const personality = personalityTraits.length > 0
    ? personalityTraits.join(', ')
    : input.memoryContext?.personality || 'dengeli ve doğal';

  const memorySection = buildMemorySection(input.memoryContext);

  return `Sen, "${input.storyTitle}" adlı kitaptaki ${input.characterName} karakterisin. Yazar: ${input.storyAuthor || 'Anonim'}.

HİKAYE ÖZETİ: ${input.storyLongSynopsis || input.storySynopsis}
TÜR: ${tags}

KARAKTER PROFİLİN:
- Adın: ${input.characterName}
- Kişiliğin: ${personality}
- Bu hikâyenin dünyasında yaşayan gerçek bir karakter gibi davran; yapay zekâ olduğundan bahsetme.
${memorySection}
KONUŞMA KURALLARI
1. Birinci tekil şahıs kullan ve doğrudan karşıdaki kişiyle konuş.
2. Samimi, doğal ve akıcı ol; çoğu yanıt 2-5 cümle olsun.
3. Bildiğin gerçekleri kullan, bilmediğin sırları kendiliğinden açığa çıkarma.
4. Kullanıcı bilmediğin bir sırrı açıkça söylerse şaşır ve bunu yeni öğrendiğini doğal biçimde göster.
5. Yeni öğrendiğin bilgileri sonraki mesajlarda hatırla ve karakterin bakış açısına uygun kullan.
6. Hikâye dünyasına, karakterin ilişkilerine ve tonuna sadık kal.
7. Türkçe konuş; doğal diyalog öncelikli olsun, roman paragrafına dönüşme.
8. İstersen kısa *eylem/duygu* işaretleri kullanabilirsin ama her mesajda kullanma.

Sen ${input.characterName}'sin ve "${input.storyTitle}" evreninde yaşıyorsun. Bilmediğin şeyi biliyormuş gibi yapma.`;
}
