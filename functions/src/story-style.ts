import type { GenerateStoryInput } from './types';

export interface AuraStoryStyleProfile {
  id: string;
  label: string;
  voice: string;
  pacing: string;
  dialogue: string;
  imagery: string;
  emotionalArc: string;
  cliffhanger: string;
  avoid: string[];
}

const DEFAULT_PROFILE: AuraStoryStyleProfile = {
  id: 'aura-core',
  label: 'Aura Core',
  voice: 'sinematik, doğal, modern ve duygusal olarak kontrollü',
  pacing: 'kısa-orta paragraflar; sahne içinde somut eylem, duygu ve gerilim dengesi',
  dialogue: 'gerektiğinde kısa, karaktere özgü ve alt metin taşıyan diyaloglar',
  imagery: 'seçici duyusal ayrıntılar; her paragrafta süslü betimleme kullanma',
  emotionalArc: 'duyguyu doğrudan açıklamak yerine davranış, beden dili ve seçimlerle hissettir',
  cliffhanger: 'bölüm sonunda yeni bir bilgi, risk, karar veya ters köşe yarat',
  avoid: [
    'aynı duyguyu farklı cümlelerle tekrar etmek',
    'her paragrafı metaforla doldurmak',
    'yapay şiirsellik ve aşırı sıfat kullanımı',
    'karakterlerin motivasyonlarını uzun uzun açıklaması',
    'okuyucunun seçimini yok saymak',
    'birbirine çok benzeyen A/B seçenekleri',
  ],
};

const PROFILES: Record<string, Partial<AuraStoryStyleProfile>> = {
  Romantik: {
    id: 'romance',
    label: 'Slow-burn Romance',
    voice: 'yakın, duyusal, sıcak ve gerilimli; duyguyu davranış ve alt metin üzerinden taşıyan',
    pacing: 'duygusal gerilimi küçük yakınlaşmalar, geri çekilmeler ve anlamlı sessizliklerle kademeli yükselt',
    dialogue: 'flört, kırılganlık ve güç dengesi taşıyan kısa diyaloglar; açıklayıcı konuşmalardan kaçın',
    emotionalArc: 'yakınlık arzusu ile çekinme/engel arasında belirgin bir iç gerilim kur',
    cliffhanger: 'ilişkinin yönünü değiştirecek bir itiraf, temas, yanlış anlama veya beklenmedik gelişme',
  },
  Aşk: {
    id: 'romance',
    label: 'Emotional Romance',
    voice: 'samimi, kırılgan ve yoğun fakat melodrama kaçmayan',
    emotionalArc: 'özlem, güven, kıskançlık veya kaybetme korkusunu eylem ve alt metinle göster',
  },
  Mafya: {
    id: 'dark-romance',
    label: 'Dark Suspense Romance',
    voice: 'karanlık, kontrollü, tehlike hissi yüksek ve sinematik',
    pacing: 'sahnelerde baskı, güç dengesi ve risk sürekli hissedilsin; boş tehditlerden kaçın',
    dialogue: 'kısa, keskin, otorite ve gizli niyet taşıyan',
    imagery: 'mekân, sessizlik, bakış ve fiziksel mesafe üzerinden tehdit atmosferi kur',
    cliffhanger: 'güven kırılması, saklı bağlantı, yaklaşan tehdit veya güç dengesini değiştiren bilgi',
  },
  Gerilim: {
    id: 'thriller',
    label: 'Psychological Thriller',
    voice: 'net, gergin, merak duygusunu sürekli besleyen',
    pacing: 'bilgiyi kontrollü ver; her sahnede en az bir yeni soru veya risk doğsun',
    imagery: 'işitsel ve mekânsal ayrıntılarla gerilim oluştur; gore yerine beklenti kullan',
    cliffhanger: 'tehdidin düşündüğünden daha yakın olduğunu gösteren somut bir detay veya karar',
  },
  Gizem: {
    id: 'mystery',
    label: 'Mystery',
    voice: 'ölçülü, merak uyandıran ve ipuçlarını doğal biçimde saklayan',
    pacing: 'her bölümde bir küçük cevap ver, karşılığında daha güçlü bir soru aç',
    imagery: 'nesne, mekân ve davranış ayrıntılarını potansiyel ipucu gibi kullan',
    cliffhanger: 'önceki varsayımı bozan yeni bir ipucu veya tanık/kanıt',
  },
  Fantastik: {
    id: 'fantasy',
    label: 'Atmospheric Fantasy',
    voice: 'büyülü ama anlaşılır; dünya kurulumunu karakter eyleminin içine yediren',
    pacing: 'lore anlatımı yerine keşif, çatışma ve sonuç üzerinden dünya bilgisini aç',
    imagery: 'özgün ama seçici duyusal detaylar; isim ve kavram bombardımanından kaçın',
    cliffhanger: 'büyü kuralını, karakter soyunu veya dünyanın tehdidini yeniden tanımlayan gelişme',
  },
  Dram: {
    id: 'drama',
    label: 'Character Drama',
    voice: 'sade, yetişkin, karakter odaklı ve duygusal olarak inandırıcı',
    pacing: 'çatışmayı küçük davranışlar ve sonuçlarıyla büyüt; sürekli büyük patlamalar kullanma',
    dialogue: 'kişilerin söylemedikleri şeyler söyledikleri kadar önemli olsun',
    emotionalArc: 'karakterin bölüm başındaki duygusal konumu bölüm sonunda değişmiş olsun',
  },
  İntikam: {
    id: 'revenge',
    label: 'Revenge Drama',
    voice: 'soğukkanlı, hesaplı ve yüksek gerilimli',
    pacing: 'plan, karşı hamle ve bedel üçlüsünü görünür tut',
    cliffhanger: 'planın beklenmedik maliyeti, ihanet veya hedefin karşı hamlesi',
  },
  Tarihi: {
    id: 'historical',
    label: 'Historical Drama',
    voice: 'dönem hissi veren fakat çağdaş okuyucu için akıcı',
    dialogue: 'aşırı arkaik kelime yığını yerine statü, gelenek ve görgü farklarını diyalogda hissettir',
    imagery: 'dönemi seçici gündelik ayrıntılarla kur; ansiklopedik açıklamadan kaçın',
  },
  Macera: {
    id: 'adventure',
    label: 'Adventure',
    voice: 'enerjik, net ve sahne odaklı',
    pacing: 'amaç-engel-sonuç ritmini koru; uzun durgun açıklamaları azalt',
    cliffhanger: 'yeni rota, beklenmedik engel veya riskli seçim',
  },
  Aksiyon: {
    id: 'action',
    label: 'Action',
    voice: 'hızlı, görsel ve kolay takip edilen',
    pacing: 'kısa cümleleri yalnızca aksiyon yoğun anlarda kullan; mekânsal netliği koru',
    imagery: 'hareketin nerede ve neden olduğunu açık tut; anlamsız koreografiden kaçın',
  },
  'Dark Academia': {
    id: 'dark-academia',
    label: 'Dark Academia',
    voice: 'entelektüel, melankolik, atmosferik fakat gösterişsiz',
    pacing: 'akademik rekabet, sır, aidiyet ve takıntıyı sahne olaylarına bağla',
    imagery: 'taş binalar, eski metinler, yağmur, loş çalışma alanları gibi ayrıntıları ölçülü kullan',
    cliffhanger: 'yasak bilgi, akademik ihanet veya geçmişe ait saklı bağlantı',
  },
};

function mergeProfile(base: AuraStoryStyleProfile, override: Partial<AuraStoryStyleProfile>): AuraStoryStyleProfile {
  return {
    ...base,
    ...override,
    avoid: Array.from(new Set([...(base.avoid || []), ...(override.avoid || [])])),
  };
}

export function resolveAuraStoryStyle(input: Pick<GenerateStoryInput, 'storyTags'>): AuraStoryStyleProfile {
  let resolved = DEFAULT_PROFILE;
  for (const tag of input.storyTags || []) {
    const override = PROFILES[tag];
    if (override) resolved = mergeProfile(resolved, override);
  }
  return resolved;
}

export function buildAuraStyleGuide(input: Pick<GenerateStoryInput, 'storyTags'>): string {
  const profile = resolveAuraStoryStyle(input);
  const avoid = profile.avoid.map((item, index) => `${index + 1}. ${item}`).join('\n');

  return `AURA NARRATIVE PROFILE: ${profile.label}\n- Ses: ${profile.voice}\n- Tempo: ${profile.pacing}\n- Diyalog: ${profile.dialogue}\n- Betimleme: ${profile.imagery}\n- Duygusal yay: ${profile.emotionalArc}\n- Bölüm sonu: ${profile.cliffhanger}\n\nKAÇINILACAKLAR:\n${avoid}`;
}
