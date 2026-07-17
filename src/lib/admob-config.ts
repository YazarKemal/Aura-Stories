/**
 * AdMob Rewarded Video Configuration — Aura Stories
 *
 * Bu dosya Capacitor AdMob entegrasyonu için merkezi yapılandırmayı içerir.
 * Geliştirme ortamında (Termux/web) simülasyon, fiziksel cihazda gerçek reklamlar kullanılır.
 *
 * @see https://developers.google.com/admob/android/test-ads
 * @see https://capacitorjs.com/docs
 */

// ══════════════════════════════════════════════════════════════
// 📱 Reklam Birimi Kimlikleri
// ══════════════════════════════════════════════════════════════

/** 🚀 PRODÜKSİYON — Gerçek Rewarded Video Ad Unit ID */
export const ADMOB_REWARDED_PROD_ID =
  'ca-app-pub-7771069325721053/1114577595';

/** 🧪 Android Rewarded Video Test Ad Unit ID (Google Resmi) */
export const ADMOB_ANDROID_REWARDED_TEST_ID =
  'ca-app-pub-3940256099942544/5224354917';

/** 🧪 iOS Rewarded Video Test Ad Unit ID (Google Resmi) */
export const ADMOB_IOS_REWARDED_TEST_ID =
  'ca-app-pub-3940256099942544/1712485313';

/**
 * CI/E2E için reklamları tamamen simülasyona zorlar.
 * `NEXT_PUBLIC_ADMOB_MODE=simulation` → native SDK hiç başlatılmaz.
 *
 * Maestro Cloud cihazında gerçek/test reklamı göstermek hem rewards-ads
 * akışını bozar hem de AdMob "geçersiz trafik" ihlali riskidir —
 * maestro.yml build adımı bu modu kullanır.
 */
export function isSimulationForced(): boolean {
  // NOT: `process.env.NEXT_PUBLIC_X` düz erişimi build'de literal ile
  // değiştirilir (isProductionMode ile aynı desen) — optional chaining
  // (`process.env?.X`) statik gömmeyi bozabilir, kullanma
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NEXT_PUBLIC_ADMOB_MODE === 'simulation';
  }
  return false;
}

/**
 * Ortam değişkenine göre prodüksiyon mu test mi olduğunu belirler.
 * .env veya .env.local dosyasında `NEXT_PUBLIC_ADMOB_MODE=production` ayarlayın.
 *
 * Varsayılan: test modu (güvenli)
 */
export function isProductionMode(): boolean {
  if (typeof process !== 'undefined' && process.env) {
    // `.env.local` → NEXT_PUBLIC_ADMOB_MODE=production ile manuel aktifleştirme
    if (process.env.NEXT_PUBLIC_ADMOB_MODE === 'production') return true;
    // Production build'te (`next build`) otomatik olarak gerçek reklamları aktif et
    if (process.env.NODE_ENV === 'production') return true;
  }
  return false;
}

/** Platforma ve ortama göre doğru Ad Unit ID'sini döndürür */
export function getRewardedAdUnitId(): string {
  // Prodüksiyon → gerçek ID (platform fark etmez, tek ID her iki platformda çalışır)
  if (isProductionMode()) {
    return ADMOB_REWARDED_PROD_ID;
  }

  // Test/Geliştirme → Google test ID'leri
  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      return ADMOB_IOS_REWARDED_TEST_ID;
    }
  }
  return ADMOB_ANDROID_REWARDED_TEST_ID;
}

// ══════════════════════════════════════════════════════════════
// 🧪 Test Cihazı Yapılandırması
// ══════════════════════════════════════════════════════════════

/**
 * TEST CİHAZI ID'NİZİ BURAYA EKLEYİN
 *
 * Fiziksel cihazınızda test reklamlarını görmek için:
 *
 * 1. Uygulamayı cihazınızda çalıştırın
 * 2. Android Studio Logcat veya Xcode Console'da şu etiketi arayın:
 *    - Android: "Ads" / "AdMob" — log satırında "Use
 *      RequestConfiguration.Builder().setTestDeviceIds(Arrays.asList("XXXXXXXX"))"
 *      yazan ID'yi kopyalayın
 *    - iOS: "GADMobileAds" — benzer şekilde test device ID loglanır
 * 3. Bulduğunuz ID'yi aşağıdaki diziye string olarak ekleyin
 *
 * Örnek: TEST_DEVICE_IDS = ['A1B2C3D4E5F6G7H8I9J0K']
 */
export const TEST_DEVICE_IDS: string[] = [
  // ↓ Kendi test cihazı ID'nizi buraya ekleyin ↓
  // 'YOUR_TEST_DEVICE_ID_HERE',
  // ↑ Kendi test cihazı ID'nizi buraya ekleyin ↑
];

// ══════════════════════════════════════════════════════════════
// ⚙️ AdMob Initialize
// ══════════════════════════════════════════════════════════════

/**
 * Capacitor AdMob başlatma fonksiyonu.
 * Uygulama başlangıcında (Providers → useEffect) bir kere çağrılır.
 *
 * - CI/E2E (`NEXT_PUBLIC_ADMOB_MODE=simulation`) → SDK hiç başlatılmaz
 * - Web/Termux (native runtime yok) → simülasyon
 * - Gerçek cihaz → AdMob SDK initialize edilir
 *
 * Prodüksiyona çıkmak için .env.local dosyasına ekleyin:
 *   NEXT_PUBLIC_ADMOB_MODE=production
 * (Not: `next build` zaten NODE_ENV=production ile otomatik prod moda geçer)
 */
export async function initializeAdMob(): Promise<void> {
  const prod = isProductionMode();

  try {
    // ── CI/E2E kilidi — Maestro cihazında SDK'yı hiç açma ──────
    if (isSimulationForced()) {
      console.warn(
        '[AdMob] Simülasyon modu zorlandı (NEXT_PUBLIC_ADMOB_MODE=simulation) — SDK başlatılmayacak.'
      );
      return;
    }

    // ── Web/Termux — native runtime yok, simülasyon ────────────
    if (!(await isCapacitorAvailable())) {
      console.warn(
        `[AdMob] Simülasyon modunda (${prod ? 'PROD' : 'TEST'}). Native platform yok — simüle reklamlar kullanılacak.`
      );
      return;
    }

    // ── Gerçek cihaz — AdMob SDK initialize ────────────────────
    const { AdMob } = await import('@capacitor-community/admob');

    await AdMob.initialize({
      /**
       * Test cihazlarını kaydet. Bu cihazlarda gerçek reklam yerine
       * test reklamları gösterilir (gelir olarak sayılmaz).
       */
      testingDevices: TEST_DEVICE_IDS,

      /**
       * Geliştirme aşamasında `true`. Prod build'de `false` → gerçek
       * reklamlar (testingDevices listesi yine de çalışır).
       */
      initializeForTesting: !prod,
    });

    console.warn(
      `[AdMob] SDK başlatıldı — ${prod ? '🚀 PROD modu, gerçek reklamlar' : '🧪 TEST modu, test reklamları'} | Ad Unit ID: ${getRewardedAdUnitId()}`
    );
  } catch (error) {
    console.warn(
      '[AdMob] Başlatma başarısız. Simülasyon moduna geçiliyor:',
      error instanceof Error ? error.message : String(error)
    );
    // Hata durumunda simülasyon moduna geç — uygulama çalışmaya devam eder
  }
}

// ══════════════════════════════════════════════════════════════
// 🎁 Ödül Miktarı
// ══════════════════════════════════════════════════════════════

/** Reklam izleme sonrası kazanılan sabit jeton miktarı */
export const AD_REWARD_AMOUNT = 5;

// ══════════════════════════════════════════════════════════════
// 🔌 Platform Algılama
// ══════════════════════════════════════════════════════════════

/**
 * Capacitor'ın yüklü olup olmadığını kontrol eder.
 * Web/Termux ortamında false döner → simülasyon kullanılır.
 */
export async function isCapacitorAvailable(): Promise<boolean> {
  try {
    // Capacitor plugin'leri sadece native runtime'da çalışır
    // Web ortamında bu import başarısız olur
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}
