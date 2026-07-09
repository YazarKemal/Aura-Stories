/**
 * Dynamic Memory & Lore State System
 *
 * Her hikaye ve karakter için ayrı bir hafıza alanı tutar.
 * Karakterin bildiği/bilmediği sırları, sohbet sırasında
 * öğrendiği gerçekleri ve konuşma geçmişini yönetir.
 */

// ── Types ────────────────────────────────────────────────────

export interface LearnedFact {
  /** The fact/secret the character learned */
  fact: string;
  /** What the user said that revealed this fact */
  revealedBy: string;
  /** When it was learned */
  timestamp: string;
  importance: 'minor' | 'major' | 'critical';
}

export interface LoreMemory {
  /** Unique identifier: storyId__characterName */
  id: string;
  storyId: string;
  storyTitle: string;
  characterName: string;
  /** Character's core personality description */
  personality: string;
  /** Secrets/facts the character ALREADY knows (part of their backstory) */
  knownSecrets: string[];
  /** Secrets/facts the character does NOT know (plot twists, hidden truths) */
  hiddenSecrets: string[];
  /** Facts the character has learned through conversation with the user */
  learnedFacts: LearnedFact[];
  /** Brief conversation summary for context continuity */
  conversationSummary: string;
  /** ISO timestamp of last update */
  lastUpdated: string;
}

// ── Seed Data: Per-Story Lore ─────────────────────────────────

const SEED_MEMORIES: LoreMemory[] = [
  // ═══ Gece Yarısı Güneşi — Kerem ═══
  {
    id: 's1__Kerem',
    storyId: 's1',
    storyTitle: 'Gece Yarısı Güneşi',
    characterName: 'Kerem',
    personality: 'gururlu, mesafeli, tutkulu, ailesinin geçmişiyle yaralı',
    knownSecrets: [
      'Konağın kütüphanesinde gizli bir geçit olduğunu biliyorum',
      'Ailemin on yıllardır Leyla\'nın ailesiyle düşman olduğunu biliyorum',
      'Büyük dedemin mektubunun bir yerlerde saklı olduğunu biliyorum',
      'Konağın doğu kanadının yıllardır kapalı olduğunu biliyorum',
    ],
    hiddenSecrets: [
      'Leyla\'nın aslında uzak bir akraba olduğu gerçeği',
      'Mektubun konağın temelinde gömülü olduğu',
      'Büyük dedenin aslında Leyla\'nın büyük annesine aşık olduğu',
      'Yangının bir kaza değil, kundaklama olduğu gerçeği',
      'Aile düşmanlığının bir yanlış anlaşılmadan doğduğu',
    ],
    learnedFacts: [],
    conversationSummary: '',
    lastUpdated: new Date().toISOString(),
  },

  // ═══ Gece Yarısı Güneşi — Leyla ═══
  {
    id: 's1__Leyla',
    storyId: 's1',
    storyTitle: 'Gece Yarısı Güneşi',
    characterName: 'Leyla',
    personality: 'idealist, meraklı, cesur, geçmişin izini süren genç araştırmacı',
    knownSecrets: [
      'Konağın kütüphanesinde eski bir mektup bulduğumu biliyorum',
      'Araştırmamın ailem tarafından engellenmeye çalışıldığını biliyorum',
      'Kerem\'in ailesiyle bizim ailemiz arasında eski bir husumet olduğunu biliyorum',
      'Mektupta bir yangından bahsedildiğini okudum',
    ],
    hiddenSecrets: [
      'Kerem\'in aslında mektubu yıllar önce bulduğu ama sakladığı',
      'Kendi büyük annesinin Kerem\'in büyük dedesiyle gizli bir aşk yaşadığı',
      'Yangını Kerem\'in büyükbabasının çıkardığı',
      'Mektubun tamamının aslında bir itirafname olduğu',
      'Ailelerin aslında kan bağı olduğu',
    ],
    learnedFacts: [],
    conversationSummary: '',
    lastUpdated: new Date().toISOString(),
  },

  // ═══ Sokakların Kanunu — Mert ═══
  {
    id: 's3__Mert',
    storyId: 's3',
    storyTitle: 'Sokakların Kanunu',
    characterName: 'Mert',
    personality: 'sert, kurnaz, sokak zekasıyla hayatta kalan, sadık',
    knownSecrets: [
      'Babamın borcu yüzünden bu hayata sürüklendiğimi biliyorum',
      'En yakın arkadaşım Can\'ın bir polis muhbiri olduğundan şüpheleniyorum',
      'Mahallenin kontrolü için iki büyük aile arasında savaş olduğunu biliyorum',
      'Depodaki malların yerini sadece üç kişi biliyor',
    ],
    hiddenSecrets: [
      'Can\'ın aslında gizli bir polis operasyonunun parçası olduğu',
      'Babamın borcunun aslında bana kurulan bir tuzak olduğu',
      'Rakip ailenin liderinin aslında öz amcam olduğu',
      'Depodaki malların çoktan polis tarafından bulunduğu',
      'Can\'ın ölmediği, tanık koruma programında olduğu',
    ],
    learnedFacts: [],
    conversationSummary: '',
    lastUpdated: new Date().toISOString(),
  },

  // ═══ Karanlık Lordun Varisi — Eryndor ═══
  {
    id: 's2__Eryndor',
    storyId: 's2',
    storyTitle: 'Karanlık Lordun Varisi',
    characterName: 'Eryndor',
    personality: 'cesur, öfkeli, adalet duygusuyla yanan, krallığının küllerinden doğan',
    knownSecrets: [
      'Karanlık Lord\'un son varisi olduğumu biliyorum',
      'Krallığın düşüşünün bir ihanet sonucu olduğunu biliyorum',
      'Büyünün kaynağının Yasak Kule\'de saklı olduğunu biliyorum',
    ],
    hiddenSecrets: [
      'İhaneti gerçekleştirenin öz kardeşi olduğu',
      'Karanlık Lord\'un aslında bir kahraman olduğu, tarihin yanlış yazıldığı',
      'Büyünün kaynağının kendi kanında zaten mevcut olduğu',
      'Yasak Kule\'nin aslında bir hapishane değil, bir sığınak olduğu',
    ],
    learnedFacts: [],
    conversationSummary: '',
    lastUpdated: new Date().toISOString(),
  },

  // ═══ Mühürlü Kapı — Selim ═══
  {
    id: 's5__Selim',
    storyId: 's5',
    storyTitle: 'Mühürlü Kapı',
    characterName: 'Selim',
    personality: 'zeki, meraklı, takıntılı, tehlikeli sularda yüzen araştırmacı',
    knownSecrets: [
      'İstanbul\'un altında antik bir geçit sistemi olduğunu keşfettim',
      'Kapının anahtarının üç parçaya bölündüğünü biliyorum',
      'Peşimde olduklarını biliyorum — kim olduklarını bilmiyorum',
    ],
    hiddenSecrets: [
      'Anahtarın bir parçasının kendi evinde saklı olduğu',
      'Peşindekilerin aslında onu korumaya çalışan devlet ajanları olduğu',
      'Kapının ardındakinin bir hazine değil, bir bilgi olduğu',
      'Üçüncü anahtar parçasının bir insanın zihninde saklı olduğu',
    ],
    learnedFacts: [],
    conversationSummary: '',
    lastUpdated: new Date().toISOString(),
  },

  // ═══ Son Yaprak Dökümü — Zeynep ═══
  {
    id: 's4__Zeynep',
    storyId: 's4',
    storyTitle: 'Son Yaprak Dökümü',
    characterName: 'Zeynep',
    personality: 'hassas, umut dolu, kırılgan ama dirençli, ailesini birleştirmeye çalışan',
    knownSecrets: [
      'Ailemin dağılma sebebinin bir miras kavgası olduğunu biliyorum',
      'Annemin günlüğünde ailemizle ilgili karanlık şeyler yazdığını biliyorum',
    ],
    hiddenSecrets: [
      'Ablasının aslında evlatlık olduğu',
      'Miras kavgasının sebebi olan arazinin çoktan satıldığı',
      'Babasının ikinci bir ailesi olduğu',
      'Annemin ölümünün intihar değil, kaza olduğu',
    ],
    learnedFacts: [],
    conversationSummary: '',
    lastUpdated: new Date().toISOString(),
  },
];

// ── In-Memory Store (sunucu yeniden başlayınca sıfırlanır) ──

const memoryStore: Map<string, LoreMemory> = new Map();

// Seed'leri yükle
for (const seed of SEED_MEMORIES) {
  memoryStore.set(seed.id, { ...seed });
}

// ── Public API ────────────────────────────────────────────────

/** Bir karakterin hafızasını yükle veya yoksa oluştur */
export function loadMemory(
  storyId: string,
  storyTitle: string,
  characterName: string
): LoreMemory {
  const id = `${storyId}__${characterName}`;

  if (memoryStore.has(id)) {
    return memoryStore.get(id)!;
  }

  // Generic fallback: hikayeye özel seed yoksa boş hafıza oluştur
  const memory: LoreMemory = {
    id,
    storyId,
    storyTitle,
    characterName,
    personality: 'karmaşık, çok boyutlu, gerçekçi',
    knownSecrets: [
      `Ben ${characterName}, "${storyTitle}" hikayesinin başrol karakteriyim`,
    ],
    hiddenSecrets: [
      'Hikayemin derinlerinde saklı, henüz keşfedilmemiş bir sır',
    ],
    learnedFacts: [],
    conversationSummary: '',
    lastUpdated: new Date().toISOString(),
  };

  memoryStore.set(id, memory);
  return memory;
}

/** Hafızayı güncelle ve kalıcı olarak kaydet */
export function saveMemory(memory: LoreMemory): void {
  memory.lastUpdated = new Date().toISOString();
  memoryStore.set(memory.id, { ...memory });
}

/** Kullanıcı mesajından yeni öğrenilen gerçekleri çıkar */
export function extractNewFacts(
  memory: LoreMemory,
  userMessage: string
): LearnedFact[] {
  const newFacts: LearnedFact[] = [];

  // Hidden secrets ile eşleşme kontrolü
  for (const secret of memory.hiddenSecrets) {
    // Gizli sırrın anahtar kelimelerini çıkar
    const keywords = secret
      .replace(/'/g, '')
      .replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4);

    // Kullanıcı mesajında bu anahtar kelimelerden en az 2 tanesi geçiyorsa
    const matchCount = keywords.filter(kw =>
      userMessage.toLowerCase().includes(kw.toLowerCase())
    ).length;

    if (matchCount >= 2) {
      // Bu sırrın zaten öğrenilmiş olup olmadığını kontrol et
      const alreadyLearned = memory.learnedFacts.some(lf =>
        lf.fact === secret
      );

      if (!alreadyLearned) {
        newFacts.push({
          fact: secret,
          revealedBy: userMessage.slice(0, 150),
          timestamp: new Date().toISOString(),
          importance: matchCount >= 4 ? 'critical' : matchCount >= 3 ? 'major' : 'minor',
        });
      }
    }
  }

  // Açık sır ifşası kalıplarını tara
  const revelationPatterns = [
    /aslında\s+(.+?)(?:\.|$)/gi,
    /gerçek şu ki\s+(.+?)(?:\.|$)/gi,
    /sana bir sır vereyim[,:]?\s*(.+?)(?:\.|$)/gi,
    /biliyor musun[,:]?\s*(.+?)(?:\.|$)/gi,
    /bilmediğin bir şey var[,:]?\s*(.+?)(?:\.|$)/gi,
    /sakladığım bir şey\s+(.+?)(?:\.|$)/gi,
  ];

  for (const pattern of revelationPatterns) {
    let match;
    while ((match = pattern.exec(userMessage)) !== null) {
      const revealedFact = match[1].trim();
      if (revealedFact.length > 10) {
        const alreadyLearned = memory.learnedFacts.some(lf =>
          lf.fact.includes(revealedFact.slice(0, 30))
        );
        if (!alreadyLearned) {
          newFacts.push({
            fact: revealedFact,
            revealedBy: userMessage.slice(0, 150),
            timestamp: new Date().toISOString(),
            importance: 'major',
          });
        }
      }
    }
  }

  return newFacts;
}

/** System prompt'a hafıza durumunu enjekte et */
export function buildMemoryContext(memory: LoreMemory): string {
  const parts: string[] = [];

  // ── Bilinenler ──
  if (memory.knownSecrets.length > 0) {
    parts.push('📖 HİKAYENDE BİLDİĞİN GERÇEKLER:');
    for (const s of memory.knownSecrets) {
      parts.push(`  ✅ ${s}`);
    }
  }

  // ── Henüz Bilinmeyenler (karaktere söylenmemeli!) ──
  if (memory.hiddenSecrets.length > 0) {
    parts.push('');
    parts.push('🔒 HENÜZ BİLMEDİĞİN SIRLAR (bunları karakter olarak BİLMİYORSUN):');
    for (const s of memory.hiddenSecrets) {
      parts.push(`  ❓ ${s}`);
    }
    parts.push('  ⚠️ Eğer kullanıcı bu sırlardan birini AÇIKÇA söylerse, şaşır ve "Bunu bilmiyordum!" tepkisi ver.');
  }

  // ── Sohbet yoluyla öğrenilenler ──
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

  return parts.join('\n');
}

/** Konuşma özetini güncelle (son 3-5 mesajdan) */
export function updateConversationSummary(
  memory: LoreMemory,
  recentMessages: { text: string; sender: string }[]
): void {
  if (recentMessages.length === 0) return;

  const userMessages = recentMessages.filter(m => m.sender === 'user');
  const charMessages = recentMessages.filter(m => m.sender === 'character');

  const lastUser = userMessages.slice(-2).map(m => m.text.slice(0, 80)).join(' | ');
  const lastChar = charMessages.slice(-2).map(m => m.text.slice(0, 80)).join(' | ');

  memory.conversationSummary =
    `Kullanıcı sordu: "${lastUser}". Karakter yanıtladı: "${lastChar}"`;
}

/** Tüm hafızaları listele (debug için) */
export function listAllMemories(): LoreMemory[] {
  return Array.from(memoryStore.values());
}
