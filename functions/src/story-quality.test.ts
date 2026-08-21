import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateStoryQuality } from './story-quality';

function makeParagraph(seed: string): string {
  return `${seed} kararın ilk sonucunu görünür kılarken karakter geri adım atmak yerine yeni riski ölçer. ${seed} sırasında kısa bir diyalog güç dengesini değiştirir ve daha önce önemsiz görünen bir ayrıntı yeni anlam kazanır. ${seed} sonunda karakterin seçimi sahnenin duygusal yönünü değiştirir; okuyucu bir sonraki hamlenin bedelini açıkça hisseder.`;
}

test('healthy serial-fiction chapter does not require rewrite', () => {
  const content = Array.from({ length: 8 }, (_, i) => makeParagraph(`Sahne ${i + 1}`)).join('\n\n');

  const result = evaluateStoryQuality({
    title: 'Kapının Ardındaki Ses',
    content,
    optionA: 'Kapıyı açıp gerçeği öğren',
    optionB: 'Sessizce geri çekilip yardım çağır',
  });

  assert.ok(result.score >= 76);
  assert.equal(result.shouldRewrite, false);
});

test('very short repetitive draft requires rewrite', () => {
  const sentence = 'Nefesi kesildi ve gözlerine inanamadı.';
  const result = evaluateStoryQuality({
    title: 'Sırlar',
    content: `${sentence} ${sentence}\n\n${sentence} ${sentence}`,
    optionA: 'Kapıyı aç',
    optionB: 'Kapıyı aç hemen',
  });

  assert.equal(result.shouldRewrite, true);
  assert.ok(result.score < 76);
  assert.ok(result.issues.length > 0);
});
