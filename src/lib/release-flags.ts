/**
 * Kapalı Test Release Flags — Aura Stories
 *
 * Kapalı test sürümünde gerçek gelir üreten özellikler devre dışıdır.
 * Her özellik yalnızca NEXT_PUBLIC_ env değişkeni açıkça "true" ise aktif olur.
 *
 * Varsayılan: tüm özellikler KAPALI (false)
 */

function isEnvTrue(key: string): boolean {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] === 'true';
  }
  return false;
}

/** Rewarded video reklamlar — gerçek veya local kredi vermez */
export const ENABLE_REWARDED_ADS = isEnvTrue('NEXT_PUBLIC_ENABLE_REWARDED_ADS');

/** VIP ekranı — premium hak vermez */
export const ENABLE_VIP = isEnvTrue('NEXT_PUBLIC_ENABLE_VIP');

/** Full-access satın alma — aktif değil */
export const ENABLE_FULL_ACCESS_PURCHASE = isEnvTrue('NEXT_PUBLIC_ENABLE_FULL_ACCESS_PURCHASE');

/** Kapalı test mesajı — özellik kullanılamadığında gösterilir */
export const CLOSED_TEST_UNAVAILABLE_MESSAGE =
  'Bu özellik kapalı test sürümünde kullanılamıyor.';
