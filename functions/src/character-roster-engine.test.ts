import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCharacterRosterPrompt,
  normalizeCharacterRoster,
} from './character-roster-engine';

const input = {
  storyId: 's-new',
  storyTitle: 'Gölgelerin Eşiği',
  storySynopsis: 'Defne ve Aras kapalı bir kasabadaki kayıp vakasını araştırır.',
  storyTags: ['Gizem', 'Gerilim'],
  currentChapter: 3,
  chapters: [
    {
      chapterNumber: 2,
      title: 'Eski İstasyon',
      content: 'Defne istasyonda Aras ile karşılaştı. Bekçi Nihat onları uzaktan izledi.',
    },
  ],
};

test('character roster prompt forbids fabricated app/system characters', () => {
  const prompt = buildCharacterRosterPrompt(input);
  assert.match(prompt, /Yeni karakter uydurma/);
  assert.match(prompt, /okuyucu.*kullanıcı.*yapay zekâ/i);
  assert.match(prompt, /Bekçi Nihat/);
});

test('character roster normalization makes stable story-scoped ids and clamps unlock chapter', () => {
  const result = normalizeCharacterRoster(input, {
    characters: [
      {
        name: 'Defne Şahin',
        role: 'Araştırmacı',
        personality: 'meraklı, temkinli, dirençli',
        unlockedAtChapter: 9,
        greeting: 'Buralarda yabancı yüz az görülür. Sen ne arıyorsun?',
      },
      {
        name: 'Defne Şahin',
        role: 'Tekrar',
        personality: 'aynı kişi tekrar',
        unlockedAtChapter: 1,
        greeting: 'Tekrar kayıt.',
      },
    ],
  });

  assert.equal(result.characters.length, 1);
  assert.equal(result.characters[0]?.id, 's-new-defne-sahin');
  assert.equal(result.characters[0]?.storyId, 's-new');
  assert.equal(result.characters[0]?.unlockedAtChapter, 3);
  assert.equal(result.sourceRevision, 'chapter-3');
});
