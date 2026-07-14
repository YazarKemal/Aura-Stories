/**
 * Personalized Story Recommendations — Statik Fallback
 *
 * Statik export (output: 'export') ile uyumludur.
 * Gerçek AI öneri işlevselliği Genkit flow üzerinden
 * server deployment'da (Vercel vb.) çalışır.
 */

// ── Types (schema ile uyumlu, genkit bağımlılığı yok) ──────────

export interface PersonalizedStoryRecommendationsInput {
  readingHistory: string[];
  preferences: string;
}

export interface PersonalizedStoryRecommendationsOutput {
  recommendations: {
    title: string;
    author: string;
    synopsis: string;
    imageUrl: string;
    readCount: number;
  }[];
}

// ── Public API ────────────────────────────────────────────────

/**
 * Statik export modunda boş öneri listesi döndürür.
 * Server deployment'da Genkit flow üzerinden gerçek AI önerileri üretir.
 */
export async function personalizeStoryRecommendations(
  _input: PersonalizedStoryRecommendationsInput
): Promise<PersonalizedStoryRecommendationsOutput> {
  if (typeof window !== 'undefined') {
    console.warn(
      '[recommendations] Statik mod — AI önerileri devre dışı. Server deployment gerekiyor.'
    );
  }
  return { recommendations: [] };
}
