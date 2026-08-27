import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStoryPrompt } from './prompts';
import { createEmptyStoryBible, reduceStoryBible, buildChapterBibleDrafts } from './storybible';

test('chapter capture records chosenFate into fateHistory via the pure reducer (A/B/force)', () => {
  const choiceDrafts = buildChapterBibleDrafts(
    { chosenFate: { option: 'A', text: 'Kapıyı aç', isForceChoice: false }, chapterNumber: 3 },
    { title: 'Sır Odası' },
  );
  const next = reduceStoryBible(createEmptyStoryBible('s1'), choiceDrafts, 3, 1000);
  assert.equal(next.fateHistory.length, 1);
  assert.equal(next.fateHistory[0]?.text, 'Kapıyı aç');
  assert.equal(next.fateHistory[0]?.origin, 'choice-A');
  assert.equal(next.fateHistory[0]?.status, 'canon');
  assert.equal(next.fateHistory[0]?.chapterNumber, 3);
  assert.equal(next.openThreads[0]?.text, 'Sır Odası');
  assert.equal(next.openThreads[0]?.status, 'draft');

  const forceDrafts = buildChapterBibleDrafts(
    { chosenFate: { option: 'B', text: 'Zorla gir', isForceChoice: true }, chapterNumber: 5 },
    { title: 'Geçit' },
  );
  assert.equal(forceDrafts[0]?.origin, 'force');
  assert.equal(forceDrafts[0]?.status, 'canon');
});

test('enriched dynamicContext flows through buildStoryPrompt with unchanged section contract', () => {
  const bibleBlock = [
    'DİNAMİK HİKÂYE WORLD STATE — REVİZYON 0',
    'YERLEŞİK GERÇEKLER (KANON)',
    '- Katılımcının adı Kemal’dir.',
    'KADER GEÇMİŞİ',
    '- Bölüm 1: Kapıyı aç [choice-A]',
    'STORY BRAIN — YÖNLENDİRME (KANON DEĞİL)',
    'Önerilen türler: Gizem',
    'Not: ... Çelişirse bu blok yok sayılır.',
  ].join('\n');

  const prompt = buildStoryPrompt({
    storyId: 's1',
    storyTitle: 'Gece Yarısı Güneşi',
    storyAuthor: 'Aura',
    storySynopsis: 'Konağın sırları giderek büyür.',
    storyTags: ['Gizem'],
    previousChapters: [],
    chosenFate: { option: 'A', text: 'Kapıyı aç', isForceChoice: false },
    chapterNumber: 2,
    dynamicContext: bibleBlock,
  });

  // Bible içeriği kanal üzerinden geçer
  assert.match(prompt, /YERLEŞİK GERÇEKLER \(KANON\)/);
  assert.match(prompt, /Çelişirse bu blok yok sayılır/);
  // Prompt bölüm başlıkları değişmemiştir
  assert.match(prompt, /DİNAMİK HİKÂYE WORLD STATE — KANONİK OTORİTE/);
  assert.match(prompt, /SÜREKLİLİK KAYDI/);
  assert.match(prompt, /KADER KARARI/);
});
