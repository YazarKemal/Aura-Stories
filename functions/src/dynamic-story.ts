import { getFirestore } from 'firebase-admin/firestore';
import type {
  DynamicChatEffects,
  DynamicImportance,
  DynamicParticipantStatus,
  DynamicRelationshipState,
  DynamicStoryState,
  StoryReaderPersona,
} from './types';

const MAX_EVENTS = 80;
const MAX_RELATIONSHIPS = 24;

const STATUS_RANK: Record<DynamicParticipantStatus, number> = {
  none: 0,
  noticed: 1,
  recognized: 2,
};

const IMPORTANCE_RANK: Record<'none' | DynamicImportance, number> = {
  none: 0,
  minor: 1,
  major: 2,
  critical: 3,
};

function clampRelationship(value: number): number {
  return Math.max(-100, Math.min(100, Math.round(value)));
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

function strongerStatus(
  current: DynamicParticipantStatus,
  incoming: DynamicParticipantStatus,
): DynamicParticipantStatus {
  return STATUS_RANK[incoming] > STATUS_RANK[current] ? incoming : current;
}

function strongerImportance(
  current: 'none' | DynamicImportance,
  incoming: 'none' | DynamicImportance,
): 'none' | DynamicImportance {
  return IMPORTANCE_RANK[incoming] > IMPORTANCE_RANK[current] ? incoming : current;
}

export function createEmptyDynamicStoryState(storyId: string): DynamicStoryState {
  return {
    version: 1,
    storyId,
    revision: 0,
    participant: {
      status: 'none',
      significance: 'none',
      identityDisclosure: 'contextual',
      echoVisibility: 'private',
    },
    events: [],
    relationships: [],
    updatedAt: 0,
  };
}

/**
 * Pure reducer. Firestore'dan bağımsız tutulduğu için Dynamic Story davranışı
 * unit test ile doğrulanabilir.
 */
export function reduceDynamicStoryState(
  previous: DynamicStoryState,
  characterName: string,
  effects: DynamicChatEffects,
  chapterNumber?: number,
  now = Date.now(),
): DynamicStoryState {
  const revision = previous.revision + 1;

  const newEvents = effects.events.map((event, index) => ({
    ...event,
    id: `${revision}-${index + 1}`,
    targetCharacter: characterName,
    chapterNumber,
    createdAt: now,
    revision,
  }));

  const relationships = [...previous.relationships];
  for (const delta of effects.relationshipDeltas) {
    const relationshipName = (delta.characterName || characterName).trim() || characterName;
    const key = normalizeName(relationshipName);
    const index = relationships.findIndex(item => normalizeName(item.characterName) === key);
    const existing = index >= 0 ? relationships[index] : undefined;
    const current: DynamicRelationshipState = existing ?? {
      characterName: relationshipName,
      trust: 0,
      affinity: 0,
      suspicion: 0,
      hostility: 0,
      revision: 0,
    };

    const updated: DynamicRelationshipState = {
      ...current,
      characterName: relationshipName,
      trust: clampRelationship(current.trust + delta.trust),
      affinity: clampRelationship(current.affinity + delta.affinity),
      suspicion: clampRelationship(current.suspicion + delta.suspicion),
      hostility: clampRelationship(current.hostility + delta.hostility),
      lastReason: delta.reason,
      revision,
    };

    if (index >= 0) relationships[index] = updated;
    else relationships.push(updated);
  }

  const participantSignal = effects.participant;
  const participant = { ...previous.participant };
  if (participantSignal) {
    const nextStatus = strongerStatus(participant.status, participantSignal.status);
    const wasInvisible = participant.status === 'none' && nextStatus !== 'none';

    participant.status = nextStatus;
    participant.significance = strongerImportance(
      participant.significance,
      participantSignal.significance,
    );
    participant.lastSeenRevision = revision;

    if (wasInvisible) {
      participant.firstSeenRevision = revision;
      if (chapterNumber) participant.firstSeenChapter = chapterNumber;
    }

    // Model yalnızca konuşmada açıkça kullanılan/edinilen kimliği yazmalı.
    // Önceden bilinen adı boş bir model cevabıyla silmeyiz.
    if (participantSignal.publicName?.trim()) {
      participant.publicName = participantSignal.publicName.trim().slice(0, 80);
    }
    if (participantSignal.publicRole?.trim()) {
      participant.publicRole = participantSignal.publicRole.trim().slice(0, 100);
    }
    if (participantSignal.reason?.trim()) {
      participant.reason = participantSignal.reason.trim().slice(0, 300);
    }
  }

  return {
    version: 1,
    storyId: previous.storyId,
    revision,
    participant,
    events: [...previous.events, ...newEvents].slice(-MAX_EVENTS),
    relationships: relationships
      .sort((a, b) => b.revision - a.revision)
      .slice(0, MAX_RELATIONSHIPS),
    updatedAt: now,
  };
}

export async function loadDynamicStoryState(
  uid: string,
  storyId: string,
): Promise<DynamicStoryState> {
  const db = getFirestore();
  const ref = db.collection('users').doc(uid).collection('dynamicStories').doc(storyId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return createEmptyDynamicStoryState(storyId);

  const data = snapshot.data() as Partial<DynamicStoryState> | undefined;
  if (!data || data.version !== 1 || data.storyId !== storyId) {
    return createEmptyDynamicStoryState(storyId);
  }

  return {
    ...createEmptyDynamicStoryState(storyId),
    ...data,
    participant: {
      ...createEmptyDynamicStoryState(storyId).participant,
      ...(data.participant || {}),
    },
    events: Array.isArray(data.events) ? data.events.slice(-MAX_EVENTS) : [],
    relationships: Array.isArray(data.relationships)
      ? data.relationships.slice(0, MAX_RELATIONSHIPS)
      : [],
  } as DynamicStoryState;
}

export async function applyDynamicChatEffects(
  uid: string,
  storyId: string,
  characterName: string,
  effects: DynamicChatEffects,
  chapterNumber?: number,
): Promise<DynamicStoryState> {
  const db = getFirestore();
  const ref = db.collection('users').doc(uid).collection('dynamicStories').doc(storyId);

  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const base = snapshot.exists
      ? ({
          ...createEmptyDynamicStoryState(storyId),
          ...(snapshot.data() as Partial<DynamicStoryState>),
          participant: {
            ...createEmptyDynamicStoryState(storyId).participant,
            ...((snapshot.data()?.participant || {}) as DynamicStoryState['participant']),
          },
        } as DynamicStoryState)
      : createEmptyDynamicStoryState(storyId);

    const next = reduceDynamicStoryState(base, characterName, effects, chapterNumber);
    transaction.set(ref, next, { merge: false });
    return next;
  });
}

/**
 * Persona tercihleri branch'e server-side kaydedilir. Bu tercih kimliğin
 * otomatik olarak karakterlerce bilinmesi anlamına gelmez; disclosure ayrı,
 * Character Echo paylaşım izni ayrı kavramlardır.
 */
export async function setDynamicParticipantPreferences(
  uid: string,
  storyId: string,
  persona?: StoryReaderPersona,
): Promise<void> {
  if (!persona) return;
  const db = getFirestore();
  const ref = db.collection('users').doc(uid).collection('dynamicStories').doc(storyId);

  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists
      ? ({
          ...createEmptyDynamicStoryState(storyId),
          ...(snapshot.data() as Partial<DynamicStoryState>),
          participant: {
            ...createEmptyDynamicStoryState(storyId).participant,
            ...((snapshot.data()?.participant || {}) as DynamicStoryState['participant']),
          },
        } as DynamicStoryState)
      : createEmptyDynamicStoryState(storyId);

    const next: DynamicStoryState = {
      ...current,
      participant: {
        ...current.participant,
        identityDisclosure: persona.identityDisclosure || current.participant.identityDisclosure || 'contextual',
        echoVisibility: persona.echoVisibility || current.participant.echoVisibility || 'private',
      },
      updatedAt: Date.now(),
    };
    transaction.set(ref, next, { merge: false });
  });
}

function relationshipLine(
  relationship: DynamicStoryState['relationships'][number],
): string {
  return `- ${relationship.characterName}: güven ${relationship.trust}, yakınlık ${relationship.affinity}, şüphe ${relationship.suspicion}, düşmanlık ${relationship.hostility}${relationship.lastReason ? ` — son neden: ${relationship.lastReason}` : ''}`;
}

export function formatDynamicStoryForNarrative(state: DynamicStoryState): string {
  const canonicalEvents = state.events
    .filter(event => event.shouldAffectStory)
    .slice(-20);

  const participant = state.participant;
  const participantLines: string[] = [];
  participantLines.push(`Durum: ${participant.status}`);
  if (participant.publicName) participantLines.push(`Hikâyede bilinen adı: ${participant.publicName}`);
  if (participant.publicRole) participantLines.push(`Hikâyede bilinen rolü: ${participant.publicRole}`);
  participantLines.push(`Hikâyedeki önemi: ${participant.significance}`);
  if (participant.firstSeenChapter) participantLines.push(`İlk anlamlı dahil oluş: Bölüm ${participant.firstSeenChapter}`);
  if (participant.reason) participantLines.push(`Dahil oluş nedeni: ${participant.reason}`);

  const eventLines = canonicalEvents.length > 0
    ? canonicalEvents.map(event => {
        const chapter = event.chapterNumber ? `Bölüm ${event.chapterNumber}; ` : '';
        const subject = event.subjectCharacter ? `; konu: ${event.subjectCharacter}` : '';
        const fact = event.fact ? `; bilgi/iddia: ${event.fact}` : '';
        return `- ${chapter}${event.targetCharacter} ile olay: ${event.summary}${subject}${fact}; karakterin tutumu: ${event.belief}; önem: ${event.importance}`;
      })
    : ['- Henüz hikâye seyrini değiştiren Character Room olayı yok.'];

  const relationshipLines = state.relationships.length > 0
    ? state.relationships.slice(0, 12).map(relationshipLine)
    : ['- Henüz kalıcı ilişki değişimi yok.'];

  return `DİNAMİK HİKÂYE WORLD STATE — REVİZYON ${state.revision}

KATILIMCI
${participantLines.map(line => `- ${line}`).join('\n')}

KANONİK CHARACTER ROOM OLAYLARI
${eventLines.join('\n')}

KATILIMCI → KARAKTER İLİŞKİLERİ
${relationshipLines.join('\n')}

YORUM KURALI:
- Bu kayıt, kullanıcının bu kişisel hikâye dalında gerçekten yarattığı değişiklikleri temsil eder.
- accepted bir bilgi karakter tarafından benimsenmiş/gerçek kabul edilmiş olabilir; uncertain yalnızca şüphe/iddia düzeyindedir; rejected reddedilmiştir. Bu farkı koru.
- Katılımcı status=none ise onu hikâyeye zorla sokma. noticed ise varlığı fark edilmiştir fakat henüz tam bir karakter gibi tanınmayabilir. recognized ise sonraki bölümlerde uygun olduğunda gerçek bir hikâye karakteri gibi kullanılabilir.
- Dünya durumuyla açıkça çelişen yeni sahne yazma.`;
}

/**
 * Character Room'da tüm dünya bilgisini karaktere omniscient biçimde vermeyiz.
 * Sadece o karakterle yaşanmış olaylar ve o karakterle ilişkinin state'i aktarılır.
 */
export function formatDynamicStoryForCharacter(
  state: DynamicStoryState,
  characterName: string,
): string {
  const normalized = normalizeName(characterName);
  const events = state.events
    .filter(event => normalizeName(event.targetCharacter) === normalized)
    .slice(-16);
  const relationship = state.relationships.find(
    item => normalizeName(item.characterName) === normalized,
  );

  const participant = state.participant;
  const participantIdentity = participant.status === 'recognized'
    ? [
        participant.publicName ? `Bilinen adı: ${participant.publicName}` : 'Adı henüz kesinleşmedi.',
        participant.publicRole ? `Bilinen rolü: ${participant.publicRole}` : '',
      ].filter(Boolean).join(' ')
    : participant.status === 'noticed'
      ? 'Bu kişi dikkatini çekmiş durumda; kimliği/rolü henüz kesin olmayabilir.'
      : 'Bu kişiyi henüz hikâyende anlamlı bir aktör olarak tanımıyorsun.';

  const eventLines = events.length > 0
    ? events.map(event => `- ${event.summary}${event.fact ? ` | bilgi/iddia: ${event.fact}` : ''} | senin tutumun: ${event.belief}`)
    : ['- Bu kişiyle henüz kanonik bir olay kaydedilmedi.'];

  return `SERVER-AUTHORITATIVE DİNAMİK HAFIZA
Katılımcı durumu: ${participant.status}. ${participantIdentity}
${relationship ? `İlişki: güven ${relationship.trust}, yakınlık ${relationship.affinity}, şüphe ${relationship.suspicion}, düşmanlık ${relationship.hostility}.` : 'İlişki değerleri henüz nötr.'}
Bu karakterin yaşadığı olaylar:
${eventLines.join('\n')}

Bu kayıt yalnızca senin bildiğin/yaşadığın olayları temsil eder. Diğer karakterlerin özel bilgilerini buradan tahmin etme.`;
}
