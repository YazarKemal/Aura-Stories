import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateStoryQuality } from './story-quality';

function makeParagraph(seed: string): string {
  return `${seed} karakterin kararını somut bir sonuçla karşılar. Sahnedeki ayrıntılar gerilimi artırırken diyalog yeni bir bilgi açar ve karakterin davranışı değişen güç dengesini görünür kılar. Okuyucu bir sonraki hamlenin bedelini hisseder.`;
}

test('healthy serial-fiction chapter does not require rewrite', () => {
  const content = Array.from({ length: 7 }, (_, i) =>
    Array.from({ length: 3 }, (__, j) => makeParagraph(`Sahne ${i + 1}-${j + 1}`)).join(' ')
  ).join('\n\n');

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
