import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyDynamicStoryState,
  formatDynamicStoryForCharacter,
  formatDynamicStoryForNarrative,
  reduceDynamicStoryState,
} from './dynamic-story';

test('critical secret can turn a reader into a recognized story participant', () => {
  const base = createEmptyDynamicStoryState('yali');
  const next = reduceDynamicStoryState(base, 'Aslı', {
    events: [{
      type: 'fact_revealed',
      summary: 'Kemal, Aslı’ya Kerem’in onu aldattığını söyledi.',
      fact: 'Kerem Aslı’yı aldatıyor.',
      subjectCharacter: 'Kerem',
      belief: 'accepted',
      importance: 'critical',
      shouldAffectStory: true,
    }],
    relationshipDeltas: [{
      characterName: 'Aslı',
      trust: 12,
      affinity: 4,
      suspicion: -2,
      hostility: 0,
      reason: 'Hayatını etkileyen kritik bir gerçeği açıkladı.',
    }],
    participant: {
      status: 'recognized',
      publicName: 'Kemal',
      publicRole: 'Yalıya gelen yabancı',
      reason: 'Aslı’nın evliliğinin seyrini değiştiren kritik bilgiyi verdi.',
      significance: 'critical',
    },
  }, 4, 1_000);

  assert.equal(next.revision, 1);
  assert.equal(next.participant.status, 'recognized');
  assert.equal(next.participant.publicName, 'Kemal');
  assert.equal(next.participant.firstSeenChapter, 4);
  assert.equal(next.events[0]?.belief, 'accepted');
  assert.equal(next.events[0]?.shouldAffectStory, true);
  assert.equal(next.relationships[0]?.trust, 12);

  const narrative = formatDynamicStoryForNarrative(next);
  assert.match(narrative, /Kerem Aslı’yı aldatıyor/);
  assert.match(narrative, /Hikâyede bilinen adı: Kemal/);
  assert.match(narrative, /Bölüm 4/);
});

test('a rejected assassination warning is still remembered as a canonical event', () => {
  const base = createEmptyDynamicStoryState('suikast');
  const next = reduceDynamicStoryState(base, 'Murat', {
    events: [{
      type: 'warning',
      summary: 'Kimliği belirsiz kişi Murat’ı yaklaşan suikast konusunda uyardı.',
      fact: 'Bu gece Murat’a suikast düzenlenecek.',
      belief: 'rejected',
      importance: 'major',
      shouldAffectStory: true,
    }],
    relationshipDeltas: [{
      trust: -4,
      affinity: 0,
      suspicion: 15,
      hostility: 2,
      reason: 'Kaynağı belirsiz ve ürkütücü bir uyarı yaptı.',
    }],
    participant: {
      status: 'noticed',
      reason: 'Tehlikeli ve spesifik bir bilgiyle ortaya çıktı.',
      significance: 'major',
    },
  }, 3, 2_000);

  assert.equal(next.participant.status, 'noticed');
  assert.equal(next.events[0]?.belief, 'rejected');

  const characterContext = formatDynamicStoryForCharacter(next, 'Murat');
  assert.match(characterContext, /suikast/);
  assert.match(characterContext, /senin tutumun: rejected/);
  assert.match(characterContext, /şüphe 15/);
});

test('participant recognition never downgrades and relationship scores are clamped', () => {
  const recognized = reduceDynamicStoryState(createEmptyDynamicStoryState('s1'), 'Aslı', {
    events: [],
    relationshipDeltas: [{
      trust: 30,
      affinity: 30,
      suspicion: 0,
      hostility: 0,
      reason: 'İlk güçlü bağ.',
    }],
    participant: {
      status: 'recognized',
      publicName: 'Bir Dost',
      significance: 'major',
    },
  });

  let current = recognized;
  for (let i = 0; i < 5; i += 1) {
    current = reduceDynamicStoryState(current, 'Aslı', {
      events: [],
      relationshipDeltas: [{
        trust: 30,
        affinity: 30,
        suspicion: -30,
        hostility: -30,
        reason: 'İlişki ilerledi.',
      }],
      participant: {
        status: 'noticed',
        significance: 'minor',
      },
    });
  }

  assert.equal(current.participant.status, 'recognized');
  assert.equal(current.participant.significance, 'major');
  assert.equal(current.relationships[0]?.trust, 100);
  assert.equal(current.relationships[0]?.affinity, 100);
  assert.equal(current.relationships[0]?.suspicion, -100);
  assert.equal(current.relationships[0]?.hostility, -100);
});
