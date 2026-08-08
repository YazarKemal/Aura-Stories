'use client';

import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type DynamicParticipantStatus = 'none' | 'noticed' | 'recognized';
export type DynamicImportance = 'none' | 'minor' | 'major' | 'critical';
export type IdentityDisclosure = 'contextual' | 'always' | 'anonymous';
export type CharacterEchoVisibility = 'private' | 'shared' | 'anonymous';

export interface DynamicParticipantSnapshot {
  status: DynamicParticipantStatus;
  publicName?: string;
  publicRole?: string;
  reason?: string;
  significance: DynamicImportance;
  firstSeenChapter?: number;
  identityDisclosure?: IdentityDisclosure;
  echoVisibility?: CharacterEchoVisibility;
}

export interface DynamicRelationshipSnapshot {
  characterName: string;
  trust: number;
  affinity: number;
  suspicion: number;
  hostility: number;
  lastReason?: string;
  revision: number;
}

export interface DynamicStorySnapshot {
  version: 1;
  storyId: string;
  revision: number;
  participant: DynamicParticipantSnapshot;
  relationships: DynamicRelationshipSnapshot[];
  events: {
    id: string;
    type: string;
    summary: string;
    targetCharacter: string;
    belief: string;
    importance: string;
    shouldAffectStory: boolean;
    chapterNumber?: number;
  }[];
  updatedAt: number;
}

export function onDynamicStorySnapshot(
  uid: string,
  storyId: string,
  callback: (state: DynamicStorySnapshot | null) => void,
): () => void {
  return onSnapshot(
    doc(db, 'users', uid, 'dynamicStories', storyId),
    snapshot => {
      callback(snapshot.exists() ? snapshot.data() as DynamicStorySnapshot : null);
    },
    error => {
      console.warn('[DynamicStory] World state dinlenemedi:', error);
      callback(null);
    },
  );
}
