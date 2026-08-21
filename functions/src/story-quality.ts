import type { GenerateStoryOutput } from './types';

export interface StoryQualityReport {
  score: number;
  shouldRewrite: boolean;
  issues: string[];
}

const CLICHES = [
  'kalbi yerinden çıkacak gibiydi',
  'nefesi kesildi',
  'zaman durmuştu',
  'gözlerine inanamadı',
  'bir anda her şey değişti',
  'hayatı sonsuza dek değişecekti',
];

function normalize(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-zçğıöşü0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function paragraphCount(value: string): number {
  return value.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).length;
}

function optionSimilarity(a: string, b: string): number {
  const left = new Set(normalize(a).split(' ').filter(Boolean));
  const right = new Set(normalize(b).split(' ').filter(Boolean));
  if (left.size === 0 || right.size === 0) return 1;

  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  const union = new Set([...left, ...right]).size;
  return union > 0 ? intersection / union : 0;
}

function repeatedSentenceRatio(content: string): number {
  const sentences = content
    .split(/[.!?]+/)
    .map(normalize)
    .filter(sentence => sentence.split(' ').length >= 5);
  if (sentences.length < 4) return 0;

  const unique = new Set(sentences);
  return 1 - unique.size / sentences.length;
}

export function evaluateStoryQuality(output: GenerateStoryOutput): StoryQualityReport {
  const issues: string[] = [];
  let score = 100;

  const words = wordCount(output.content);
  if (words < 330) {
    issues.push(`Bölüm çok kısa (${words} kelime).`);
    score -= 24;
  } else if (words < 400) {
    issues.push(`Bölüm hedefin altında (${words} kelime).`);
    score -= 10;
  } else if (words > 720) {
    issues.push(`Bölüm mobil okuma için fazla uzun (${words} kelime).`);
    score -= 12;
  }

  const paragraphs = paragraphCount(output.content);
  if (paragraphs < 4) {
    issues.push(`Paragraf ritmi zayıf (${paragraphs} paragraf).`);
    score -= 14;
  } else if (paragraphs > 12) {
    issues.push(`Paragraf sayısı gereğinden yüksek (${paragraphs}).`);
    score -= 6;
  }

  const normalizedContent = normalize(output.content);
  const clicheHits = CLICHES.filter(cliche => normalizedContent.includes(normalize(cliche))).length;
  if (clicheHits >= 2) {
    issues.push(`Klişe ifade yoğunluğu yüksek (${clicheHits}).`);
    score -= Math.min(18, clicheHits * 6);
  }

  const repetition = repeatedSentenceRatio(output.content);
  if (repetition > 0.12) {
    issues.push('Cümle tekrar oranı yüksek.');
    score -= 14;
  }

  const similarity = optionSimilarity(output.optionA, output.optionB);
  if (similarity > 0.55) {
    issues.push('A/B kader seçenekleri birbirine fazla benziyor.');
    score -= 20;
  }

  const aWords = wordCount(output.optionA);
  const bWords = wordCount(output.optionB);
  if (aWords < 3 || bWords < 3 || aWords > 16 || bWords > 16) {
    issues.push('Kader seçeneklerinden biri ideal uzunlukta değil.');
    score -= 8;
  }

  if (wordCount(output.title) > 8 || output.title.trim().length < 2) {
    issues.push('Bölüm başlığı fazla uzun veya geçersiz.');
    score -= 5;
  }

  score = Math.max(0, Math.min(100, score));
  return {
    score,
    shouldRewrite: score < 76 || similarity > 0.7 || words < 300,
    issues,
  };
}
