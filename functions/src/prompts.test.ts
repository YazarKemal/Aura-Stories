import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChatPrompt, buildStoryPrompt } from './prompts';

test('character prompt prefers canonical role and personality over genre defaults', () => {
  const prompt = buildChatPrompt({
    storyId: 's1',
    storyTitle: 'Gece Yarısı Güneşi',
    storySynopsis: 'Eski bir konağın sırları açığa çıkar.',
    storyTags: ['Romantik', 'Gerilim'],
    storyAuthor: 'Aura',
    characterName: 'Zehra',
    characterRole: 'Konağın Hizmetkârı',
    characterPersonality: 'sadık, sessiz, her şeyi gören ve bilge',
    messages: [{ text: 'Beni hatırlıyor musun?', sender: 'user' }],
    memoryContext: {
      personality: 'fallback kişilik',
      knownSecrets: [],
      hiddenSecrets: [],
      learnedFacts: [],
      conversationSummary: 'KİMLİK BAĞLAMA GÖRE ÖĞRENİLİR: İsim henüz karaktere açıklanmadı.',
    },
  });

  assert.match(prompt, /Konağın Hizmetkârı/);
  assert.match(prompt, /sadık, sessiz, her şeyi gören ve bilge/);
  assert.match(prompt, /SERVER-AUTHORITATIVE DİNAMİK HAFIZA/);
  assert.doesNotMatch(prompt, /Kişiliğin: tutkulu, duygusal ve romantik/);
});

test('story prompt keeps earlier chapters in long-term continuity memory', () => {
  const previousChapters = Array.from({ length: 7 }, (_, index) => ({
    chapterNumber: index + 1,
    title: index === 0 ? 'İlk Mühür' : `Bölüm ${index + 1}`,
    content: `Bölüm ${index + 1} olayları. `.repeat(60),
    chosenOption: index === 0 ? 'Mührü sakla' : undefined,
  }));

  const prompt = buildStoryPrompt({
    storyId: 's1',
    storyTitle: 'Gece Yarısı Güneşi',
    storyAuthor: 'Aura',
    storySynopsis: 'Konağın sırları giderek büyür.',
    storyTags: ['Gizem'],
    previousChapters,
    chosenFate: { option: 'A', text: 'Kapıyı aç', isForceChoice: false },
    chapterNumber: 8,
  });

  assert.match(prompt, /UZUN DÖNEM OLAY HAFIZASI/);
  assert.match(prompt, /İlk Mühür/);
  assert.match(prompt, /Mührü sakla/);
  assert.match(prompt, /YAKIN DÖNEM SAHNE HAFIZASI/);
});

test('contextual reader persona identity is not leaked into story prompt before recognition', () => {
  const prompt = buildStoryPrompt({
    storyId: 's1',
    storyTitle: 'Gece Yarısı Güneşi',
    storyAuthor: 'Aura',
    storySynopsis: 'Konağın sırları giderek büyür.',
    storyTags: ['Gizem'],
    previousChapters: [],
    chosenFate: { option: 'B', text: 'Defteri Zehra ile paylaş', isForceChoice: false },
    chapterNumber: 2,
    readerPersona: {
      name: 'Kemal',
      role: 'Konağa yeni gelen araştırmacı',
      traits: ['meraklı', 'temkinli'],
      note: 'Zehra ile daha önce kısa bir konuşma yaptı.',
      identityDisclosure: 'contextual',
      echoVisibility: 'private',
    },
  });

  assert.match(prompt, /KİMLİK BAĞLAMA GÖRE ÖĞRENİLİR/);
  assert.match(prompt, /meraklı, temkinli/);
  assert.doesNotMatch(prompt, /Kemal/);
  assert.doesNotMatch(prompt, /Konağa yeni gelen araştırmacı/);
  assert.doesNotMatch(prompt, /Zehra ile daha önce kısa bir konuşma yaptı/);
});

test('always-disclosed persona can be named but still is not automatically canonical', () => {
  const prompt = buildStoryPrompt({
    storyId: 's1',
    storyTitle: 'Gece Yarısı Güneşi',
    storySynopsis: 'Konağın sırları giderek büyür.',
    previousChapters: [],
    chosenFate: { option: 'A', text: 'Bekle', isForceChoice: false },
    chapterNumber: 2,
    readerPersona: {
      name: 'Kemal',
      role: 'Araştırmacı',
      traits: [],
      note: '',
      identityDisclosure: 'always',
      echoVisibility: 'shared',
    },
  });

  assert.match(prompt, /Adı: Kemal/);
  assert.match(prompt, /Hikâye içindeki rolü: Araştırmacı/);
  assert.match(prompt, /tek başına kişinin kanonik olarak ana olaylara karıştığı anlamına gelmez/);
});

test('server Dynamic Story belief state outranks conflicting client lore candidates', () => {
  const prompt = buildChatPrompt({
    storyId: 'yali',
    storyTitle: 'Yalıdaki Sır',
    storySynopsis: 'Kerem ve Aslı’nın evliliği bir sırla sarsılır.',
    characterName: 'Aslı',
    characterRole: 'Kerem’in eşi',
    messages: [{ text: 'Kerem seni aldatıyor.', sender: 'user' }],
    memoryContext: {
      personality: 'şüpheci',
      knownSecrets: ['Kerem Aslı’yı aldatıyor.'],
      hiddenSecrets: [],
      learnedFacts: [{
        fact: 'Kerem Aslı’yı aldatıyor.',
        revealedBy: 'user',
        timestamp: 'now',
        importance: 'critical',
      }],
      conversationSummary: '',
    },
    dynamicContext: 'SERVER-AUTHORITATIVE DİNAMİK HAFIZA\n- İddia: Kerem Aslı’yı aldatıyor.\n- Aslı’nın tutumu: belief=rejected.',
  });

  assert.match(prompt, /yerel sohbet hafızası çelişirse server state'i izle/i);
  assert.match(prompt, /belief=accepted\/uncertain\/rejected/);
  assert.match(prompt, /belief=rejected/);
  assert.match(prompt, /KANONİK DEĞİL/);
});
