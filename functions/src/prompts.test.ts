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
      conversationSummary: 'KARŞINDAKİ KİŞİ: Kemal. Rolü: Hikâyenin Misafiri.',
    },
  });

  assert.match(prompt, /Konağın Hizmetkârı/);
  assert.match(prompt, /sadık, sessiz, her şeyi gören ve bilge/);
  assert.match(prompt, /KARŞINDAKİ KİŞİ: Kemal/);
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

test('story prompt treats reader persona as a real in-world participant', () => {
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
    },
  });

  assert.match(prompt, /HİKÂYEYE KATILAN KİŞİ/);
  assert.match(prompt, /Adı: Kemal/);
  assert.match(prompt, /Konağa yeni gelen araştırmacı/);
  assert.match(prompt, /soyut bir "okuyucu" değildir/);
  assert.match(prompt, /mevcut ana karakterleri zorla yerinden etme/);
});
