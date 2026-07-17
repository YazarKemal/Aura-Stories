/**
 * Interstitial (Geçiş) Reklam Yöneticisi — Aura Stories
 *
 * SADECE doğal çıkış anlarında çağrılır (okumadan çıkış, kitap detayı
 * kapanışı — page.tsx). Fire-and-forget: asla throw etmez, navigasyonu
 * ASLA bloklamaz. Web/CI ortamında guard zinciri sayesinde hiçbir görsel
 * etki üretmez.
 *
 * VIP muafiyeti bu modülde DEĞİL, çağrı noktasında uygulanır (page.tsx'te
 * `isVipActive()` kontrolü) — burası saf reklam mantığıdır.
 */

import {
  getInterstitialAdUnitId,
  isCapacitorAvailable,
  isSimulationForced,
} from '@/lib/admob-config';

// ══════════════════════════════════════════════════════════════
// ⏱️ Frekans Sınırları (tek yerde)
// ══════════════════════════════════════════════════════════════

/** İki interstitial arasındaki en az süre */
export const INTERSTITIAL_MIN_INTERVAL_MS = 180_000; // 3 dk

/** Oturum (uygulama açılışı) başına en fazla gösterim */
export const INTERSTITIAL_MAX_PER_SESSION = 4;

/** Uygulama açılışından itibaren gösterimsiz koruma süresi */
export const INTERSTITIAL_INITIAL_COOLDOWN_MS = 120_000; // 2 dk

// ══════════════════════════════════════════════════════════════
// 📊 Module-level durum (React state gerekmez; restart'ta sıfırlanır,
//    açılış soğuması restart spam'ini zaten engeller)
// ══════════════════════════════════════════════════════════════

const moduleLoadedAt = Date.now();
let lastShownAt = 0;
let sessionCount = 0;
let isPreloaded = false;
let isShowing = false;

function frequencyAllows(): boolean {
  const now = Date.now();
  if (sessionCount >= INTERSTITIAL_MAX_PER_SESSION) return false;
  if (now - moduleLoadedAt < INTERSTITIAL_INITIAL_COOLDOWN_MS) return false;
  if (lastShownAt !== 0 && now - lastShownAt < INTERSTITIAL_MIN_INTERVAL_MS) {
    return false;
  }
  return true;
}

/** Sonraki gösterim için reklamı arka planda hazırla (sessiz) */
async function preloadInterstitial(): Promise<void> {
  try {
    const { AdMob } = await import('@capacitor-community/admob');
    await AdMob.prepareInterstitial({ adId: getInterstitialAdUnitId() });
    isPreloaded = true;
  } catch {
    isPreloaded = false;
  }
}

/**
 * Uygunsa interstitial göster — fire-and-forget.
 *
 * Guard zinciri sırayla: SSR → web (http protokolü, watchAd idiomu) →
 * CI simülasyonu → gösterim kilidi → frekans → native runtime.
 * Herhangi bir aşama başarısızsa SESSİZCE geçilir; çağıran taraf
 * hiçbir sonucu beklemek zorunda değildir.
 */
export async function maybeShowInterstitial(): Promise<void> {
  try {
    if (typeof window === 'undefined') return; // SSR
    // http/https → web/tarayıcı; capacitor:// → gerçek native uygulama
    if (window.location.protocol.startsWith('http')) return;
    if (isSimulationForced()) return; // CI — Maestro hiç reklam görmez
    if (isShowing) return;
    if (!frequencyAllows()) return;
    if (!(await isCapacitorAvailable())) return;

    const { AdMob, InterstitialAdPluginEvents } = await import(
      '@capacitor-community/admob'
    );

    // Preload yoksa şimdi hazırla; başarısızsa bu çıkışta reklam yok
    if (!isPreloaded) {
      await AdMob.prepareInterstitial({ adId: getInterstitialAdUnitId() });
    }
    isPreloaded = false;
    isShowing = true;

    // watchAd'deki settled + listener temizliği deseni (user-state.tsx):
    // listener'lar plugin genelinde GLOBAL — bitişte kaldırılmazsa birikir
    const listeners: Array<{ remove: () => Promise<void> }> = [];
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      listeners.forEach(l => { l.remove().catch(() => {}); });
      isShowing = false;
      // Bir sonraki gösterime hazırlan (sessiz, beklenmez)
      preloadInterstitial();
    };

    AdMob.addListener(InterstitialAdPluginEvents.Showed, () => {
      lastShownAt = Date.now();
      sessionCount += 1;
    }).then(h => listeners.push(h));

    AdMob.addListener(InterstitialAdPluginEvents.Dismissed, settle)
      .then(h => listeners.push(h));

    AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, settle)
      .then(h => listeners.push(h));

    await AdMob.showInterstitial().catch(settle);
  } catch {
    isShowing = false;
    // Sessizce geç — reklam gösterilememesi hiçbir akışı etkilememeli
  }
}
