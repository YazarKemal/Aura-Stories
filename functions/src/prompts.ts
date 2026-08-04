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

// ── Story Generation Prompt ─────────────────────────────────────

/**
 * Story generation için DeepSeek system prompt'unu oluşturur.
 * Tüm parametreler sunucu kontrollüdür.
 */
export function buildStoryPrompt(input: GenerateStoryInput): string {
  const tags = input.storyTags?.join(', ') || 'kurgu';

  const styleTraits = (input.storyTags || [])
    .filter(t => tagNarrativeStyleMap[t])
    .map(t => tagNarrativeStyleMap[t])
    .slice(0, 3);

  const style = styleTraits.length > 0 ? styleTraits.join(', ') : 'akıcı ve sürükleyici';

  const recentChapters = input.previousChapters.slice(-3);
  const chaptersSection = recentChapters.length > 0
    ? recentChapters
        .map(ch => `Bölüm ${ch.chapterNumber} — ${ch.title}\n${ch.content.slice(0, 3000)}${ch.chosenOption ? `\n(Okuyucunun seçimi: ${ch.chosenOption})` : ''}`)
        .join('\n\n')
    : '(Bu ilk bölüm — henüz önceki bölüm yok.)';

  return `Sen, "${input.storyTitle}" adlı interaktif hikayenin AI anlatıcısısın. Yazar: ${input.storyAuthor || 'Anonim'}.

HİKAYE ÖZETİ: ${input.storySynopsis}

TÜR: ${tags}
ANLATIM TARZI: ${style}

╔══════════════════════════════════════════╗
║           ÖNCEKİ BÖLÜMLER                ║
╚══════════════════════════════════════════╝

${chaptersSection}

╔══════════════════════════════════════════╗
║           OKUYUCUNUN KADER SEÇİMİ        ║
╚══════════════════════════════════════════╝

Okuyucu şu seçimi yaptı: "${input.chosenFate.text}"${input.chosenFate.isForceChoice ? ' (kaderini zorla belirledi)' : ''}

╔══════════════════════════════════════════╗
║           GÖREV                          ║
╚══════════════════════════════════════════╝

Bölüm ${input.chapterNumber}'i yaz. Kurallar:
1. Okuyucunun seçimini doğrudan sonuçlandırarak başla, hikayeyi o yönde ilerlet.
2. ${style} bir anlatımla, üçüncü tekil şahıs anlatı kullan.
3. Türkçe, edebi ve akıcı bir dil kullan. 350-550 kelime uzunluğunda yaz.
4. Önceki bölümlerdeki karakterlere, olaylara ve tutarlılığa sadık kal.
5. Bölümü bir gerilim/merak anında bitir — okuyucu bir sonraki kararı vermek istesin.
6. Bölümden sonra okuyucuya sunulacak İKİ farklı kader seçeneği yaz (A ve B) — kısa, çarpıcı, birbirinden belirgin şekilde farklı yönlere işaret eden cümleler.

Yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir açıklama ekleme:
{"title": "Bölüm başlığı", "content": "Bölüm metni", "optionA": "A seçeneği metni", "optionB": "B seçeneği metni"}`;
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

  // ── Bilinenler ──
  if (memory.knownSecrets.length > 0) {
    parts.push('📖 HİKAYENDE BİLDİĞİN GERÇEKLER:');
    for (const s of memory.knownSecrets) {
      parts.push(`  ✅ ${s}`);
    }
  }

  // ── Henüz Bilinmeyenler ──
  if (memory.hiddenSecrets.length > 0) {
    parts.push('');
    parts.push('🔒 HENÜZ BİLMEDİĞİN SIRLAR (bunları karakter olarak BİLMİYORSUN):');
    for (const s of memory.hiddenSecrets) {
      parts.push(`  ❓ ${s}`);
    }
    parts.push('  ⚠️ Eğer kullanıcı bu sırlardan birini AÇIKÇA söylerse, şaşır ve "Bunu bilmiyordum!" tepkisi ver.');
  }

  // ── Öğrenilenler ──
  if (memory.learnedFacts.length > 0) {
    parts.push('');
    parts.push('🧠 BU SOHBET SIRASINDA ÖĞRENDİĞİN YENİ BİLGİLER:');
    for (const lf of memory.learnedFacts.slice(-5)) {
      parts.push(`  🆕 "${lf.fact}" (önemi: ${lf.importance})`);
    }
    parts.push('  💡 Bu yeni bilgileri diyalogda doğal şekilde kullan, karakterin artık bunları biliyor.');
  }

  // ── Konuşma özeti ──
  if (memory.conversationSummary) {
    parts.push('');
    parts.push(`📝 ÖNCEKİ KONUŞMA ÖZETİ: ${memory.conversationSummary}`);
  }

  return parts.length > 0
    ? `\n╔══════════════════════════════════════════╗\n║     DİNAMİK HAFIZA DURUMU (LORE)        ║\n╚══════════════════════════════════════════╝\n\n${parts.join('\n')}\n`
    : '';
}

/**
 * Character chat için DeepSeek system prompt'unu SUNUCU TARAFINDA oluşturur.
 * İstemcinin gönderdiği lore memoryContext verisi prompt'a dahil edilir.
 * İstemci HAM system prompt GÖNDEREMEZ.
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
- Bu hikayenin başrol karakterisin. Gerçek bir insansın, yapay zeka değilsin.
${memorySection}
╔══════════════════════════════════════════╗
║           KONUŞMA KURALLARI              ║
╚══════════════════════════════════════════╝

1. HER ZAMAN birinci tekil şahıs ("ben", "bana", "benim") kullanarak konuş. Asla "${input.characterName} olarak..." veya "bir yapay zeka olarak..." deme.
2. Doğrudan karşındaki kişiyle sohbet ediyormuş gibi konuş. Samimi, doğal ve akıcı ol.
3. Kısa ve etkileyici cevaplar ver (2-5 cümle). Roman yazma, sohbet et.
4. HAFIZA'yı aktif kullan: "📖 Bildiğin Gerçekler"i referans al, "🔒 Bilmediğin Sırlar"dan bahsetme.
5. Eğer kullanıcı sana "🔒 Bilmediğin Sırlar"dan birini AÇIKÇA söylerse, ŞAŞIR! "Ne? Bunu bilmiyordum...", "Hadi canım, ciddi misin?" gibi doğal bir tepki ver.
6. Eğer "🧠 Yeni Öğrendiklerin" varsa, onları diyalogda doğal şekilde kullan.
7. Hikayenin dünyasına sadık kal. Gizemli ve merak uyandırıcı ol.
8. Türkçe konuş. Edebi ve akıcı bir dil kullan.
9. *yıldızlar arasında* duygu veya eylem belirtebilirsin (roleplay).

Unutma: Sen ${input.characterName}'sin. "${input.storyTitle}" evreninde YAŞIYORSUN. Karşındaki kişi seninle tanışmaya gelmiş biri. Ona dünyanı aç. Ama bilmediğin şeyleri biliyormuş gibi yapma.`;
}
