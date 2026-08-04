/**
 * Per-User Rate Limiter — Firebase Functions
 *
 * Firestore üzerinden kullanıcı UID'sine bağlı dakikalık ve günlük
 * istek sayısı sınırlaması. İstemci localStorage'ına GÜVENMEZ.
 *
 * Limits (sunucu kontrollü, değiştirilemez):
 *   Chat:    10 istek/dakika, 100 istek/gün
 *   Story:    5 istek/dakika,  30 istek/gün
 */
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

// ── Sabit limitler ────────────────────────────────────────────

interface RateLimitConfig {
  /** Dakikada maksimum istek */
  maxPerMinute: number;
  /** Günde maksimum istek */
  maxPerDay: number;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  generateStory: { maxPerMinute: 5, maxPerDay: 30 },
  characterChat: { maxPerMinute: 10, maxPerDay: 100 },
} as const;

// ── Public API ────────────────────────────────────────────────

/**
 * Kullanıcının rate limit'ini kontrol eder ve sayacı artırır.
 * Limit aşıldıysa HttpsError fırlatır.
 *
 * @param uid       - Kullanıcı UID'si
 * @param operation - 'generateStory' veya 'characterChat'
 */
export async function checkRateLimit(
  uid: string,
  operation: keyof typeof RATE_LIMITS
): Promise<void> {
  const limits = RATE_LIMITS[operation];
  if (!limits) return; // Bilinmeyen operasyon → sessizce izin ver

  const db = getFirestore();
  const now = Date.now();
  const minuteWindow = Math.floor(now / 60_000); // dakika penceresi
  const dayWindow = new Date().toISOString().slice(0, 10); // "2026-08-04"

  const docRef = db.collection('users').doc(uid).collection('rateLimits').doc(operation);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const data = snap.data() || {};

      const currentMinute = data.minuteWindow as number | undefined;
      const currentDay = data.dayWindow as string | undefined;

      // Yeni pencere → sayaçları sıfırla
      const minuteCount = (currentMinute === minuteWindow) ? (data.minuteCount as number || 0) : 0;
      const dayCount = (currentDay === dayWindow) ? (data.dayCount as number || 0) : 0;

      // Limit kontrolü
      if (minuteCount >= limits.maxPerMinute) {
        throw new HttpsError(
          'resource-exhausted',
          `Çok fazla istek gönderdiniz. Lütfen bir dakika bekleyin.`
        );
      }

      if (dayCount >= limits.maxPerDay) {
        throw new HttpsError(
          'resource-exhausted',
          `Günlük istek limitinize ulaştınız. Yarın tekrar deneyin.`
        );
      }

      // Sayacı artır
      tx.set(docRef, {
        minuteCount: minuteCount + 1,
        minuteWindow,
        dayCount: dayCount + 1,
        dayWindow,
        lastRequestAt: now,
      }, { merge: true });
    });
  } catch (err: unknown) {
    if (err instanceof HttpsError) throw err;

    // Firestore hatası → rate limit kontrolü yapılamadı.
    // Güvenli tarafta kalmak için izin ver ama log'la.
    console.error(`[rate-limiter] Firestore hatası (${operation}, ${uid}):`, err);
  }
}
