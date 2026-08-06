/**
 * Kapalı Test Release Flags — Aura Stories
 *
 * Kapalı test sürümünde gerçek gelir üreten özellikler devre dışıdır.
 * Her özellik yalnızca NEXT_PUBLIC_ env değişkeni açıkça "true" ise aktif olur.
 *
 * Varsayılan: tüm özellikler KAPALI (false)
 *
 * Derleme zamanı sabitleri olarak doğrudan process.env kullanılır —
 * dinamik process.env[key] erişimi Next.js client bundle'ında güvenilir değildir.
 */

/** Rewarded video reklamlar — gerçek veya local kredi vermez */
export const ENABLE_REWARDED_ADS =
  process.env.NEXT_PUBLIC_ENABLE_REWARDED_ADS === 'true';

/** VIP ekranı — premium hak vermez */
export const ENABLE_VIP =
  process.env.NEXT_PUBLIC_ENABLE_VIP === 'true';

/** Full-access satın alma — aktif değil */
export const ENABLE_FULL_ACCESS_PURCHASE =
  process.env.NEXT_PUBLIC_ENABLE_FULL_ACCESS_PURCHASE === 'true';

/** Kapalı test mesajı — özellik kullanılamadığında gösterilir */
export const CLOSED_TEST_UNAVAILABLE_MESSAGE =
  'Bu özellik kapalı test sürümünde kullanılamıyor.';
