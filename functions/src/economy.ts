/**
 * Server-Authoritative Economy Module
 *
 * TÜM jeton işlemleri bu modül üzerinden Firestore transaction ile yapılır.
 * İstemci credits/role/vipUntil alanlarını DOĞRUDAN DEĞİŞTİREMEZ
 * (firestore.rules ile korunur).
 *
 * İşlemler:
 *   spendCredits   — jeton harcama (negatif bakiyeye izin VERMEZ)
 *   addCredits     — jeton ekleme (admin veya Functions tarafından)
 *   claimDailyGift — günlük hediye (UTC gün penceresi)
 *   recordTransaction — işlem defterine kayıt
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ── Ekonomi sabitleri (istemci sabitleriyle EŞLEŞMELİ) ──────

export const CHAT_MESSAGE_COST = 5;
export const CHAPTER_UNLOCK_COST = 15;
export const FORCE_FATE_COST = 50;
export const FULL_ACCESS_COST = 75;
export const AD_REWARD_AMOUNT = 5;
export const DAILY_GIFT_AMOUNT = 50;
export const INITIAL_CREDITS = 200;

// ── Types ────────────────────────────────────────────────────

export interface TransactionRecord {
  uid: string;
  operation: 'spend' | 'add' | 'daily_gift' | 'ad_reward';
  amount: number;
  /** Benzersiz işlem kimliği — idempotency için */
  operationId: string;
  detail: string;
  balanceAfter: number;
  createdAt: FieldValue;
}

export interface SpendResult {
  success: true;
  balanceAfter: number;
  alreadyProcessed?: boolean;
}

export interface ClaimGiftResult {
  success: true;
  amount: number;
  balanceAfter: number;
}

// ── Helpers ──────────────────────────────────────────────────

let _db: ReturnType<typeof getFirestore> | null = null;
function db() {
  if (!_db) _db = getFirestore();
  return _db;
}

/**
 * İşlemin daha önce yapılıp yapılmadığını kontrol eder.
 * Idempotency: aynı operationId ile tekrar çağrılırsa
 * jeton İKİNCİ KEZ düşülmez.
 */
async function checkIdempotency(
  uid: string,
  operationId: string
): Promise<TransactionRecord | null> {
  const snap = await db()
    .collection('users').doc(uid)
    .collection('transactions')
    .doc(operationId)
    .get();
  return snap.exists ? (snap.data() as TransactionRecord) : null;
}

/**
 * Kullanıcı belgesini transaction içinde okur.
 * Returns the user document snapshot.
 */
function userRef(uid: string) {
  return db().collection('users').doc(uid);
}

function txRef(uid: string, operationId: string) {
  return db().collection('users').doc(uid)
    .collection('transactions').doc(operationId);
}

// ── Public API ────────────────────────────────────────────────

/**
 * Jeton harcar. Negatif bakiyeye İZİN VERMEZ.
 * Firestore transaction ile atomiktir.
 * Aynı operationId tekrar çağrılırsa jeton düşmez, mevcut sonucu döner.
 *
 * @returns SpendResult — success + yeni bakiye
 * @throws  'INSUFFICIENT_CREDITS'  — yetersiz bakiye
 * @throws  'USER_NOT_FOUND'        — kullanıcı belgesi yok
 */
export async function spendCredits(
  uid: string,
  amount: number,
  operationId: string,
  detail: string
): Promise<SpendResult> {
  if (amount <= 0) {
    throw new Error('Harcama miktarı pozitif olmalıdır.');
  }

  // Idempotency kontrolü
  const existing = await checkIdempotency(uid, operationId);
  if (existing) {
    return { success: true, balanceAfter: existing.balanceAfter, alreadyProcessed: true };
  }

  try {
    const result = await db().runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef(uid));
      if (!userSnap.exists) {
        throw { code: 'USER_NOT_FOUND' };
      }

      const data = userSnap.data()!;
      const currentCredits: number = data.credits ?? 0;

      if (currentCredits < amount) {
        throw { code: 'INSUFFICIENT_CREDITS' };
      }

      const newBalance = currentCredits - amount;

      // Atomik güncelleme
      tx.update(userRef(uid), { credits: newBalance });

      // İşlem defteri
      tx.set(txRef(uid, operationId), {
        uid,
        operation: 'spend',
        amount: -amount,
        operationId,
        detail,
        balanceAfter: newBalance,
        createdAt: FieldValue.serverTimestamp(),
      });

      return { balanceAfter: newBalance };
    });

    return { success: true, balanceAfter: result.balanceAfter };
  } catch (err: any) {
    if (err?.code === 'INSUFFICIENT_CREDITS') {
      throw { code: 'INSUFFICIENT_CREDITS', message: `Yetersiz bakiye. Gereken: ${amount}, mevcut: yetersiz.` };
    }
    if (err?.code === 'USER_NOT_FOUND') {
      throw { code: 'USER_NOT_FOUND', message: 'Kullanıcı bulunamadı.' };
    }
    throw err;
  }
}

/**
 * Jeton ekler (pozitif bakiye değişimi).
 * Yalnızca Functions (Admin SDK) tarafından çağrılabilir.
 * İstemci bu fonksiyonu DOĞRUDAN ÇAĞIRAMAZ.
 */
export async function addCredits(
  uid: string,
  amount: number,
  operationId: string,
  operation: TransactionRecord['operation'],
  detail: string
): Promise<{ balanceAfter: number }> {
  if (amount <= 0) {
    throw new Error('Eklenen miktar pozitif olmalıdır.');
  }

  const existing = await checkIdempotency(uid, operationId);
  if (existing) {
    return { balanceAfter: existing.balanceAfter };
  }

  const result = await db().runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef(uid));
    if (!userSnap.exists) {
      throw { code: 'USER_NOT_FOUND' };
    }

    const data = userSnap.data()!;
    const currentCredits: number = data.credits ?? 0;
    const newBalance = currentCredits + amount;

    tx.update(userRef(uid), { credits: newBalance });

    tx.set(txRef(uid, operationId), {
      uid,
      operation,
      amount,
      operationId,
      detail,
      balanceAfter: newBalance,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { balanceAfter: newBalance };
  });

  return { balanceAfter: result.balanceAfter };
}

/**
 * Günlük hediyeyi talep eder. Sunucu UTC gün penceresi kullanır.
 * İstemci saatine GÜVENMEZ.
 */
export async function claimDailyGift(
  uid: string,
  operationId: string
): Promise<ClaimGiftResult> {
  // Idempotency kontrolü
  const existing = await checkIdempotency(uid, operationId);
  if (existing) {
    return {
      success: true,
      amount: DAILY_GIFT_AMOUNT,
      balanceAfter: existing.balanceAfter,
    };
  }

  const today = new Date().toISOString().slice(0, 10); // "2026-08-04"

  try {
    const result = await db().runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef(uid));
      if (!userSnap.exists) {
        throw { code: 'USER_NOT_FOUND' };
      }

      const data = userSnap.data()!;
      const lastClaimed: string | null = data.lastGiftClaimedAt ?? null;
      const lastClaimedDay = lastClaimed ? lastClaimed.slice(0, 10) : null;

      // Aynı UTC günü içinde ikinci talep reddedilir
      if (lastClaimedDay === today) {
        throw { code: 'ALREADY_CLAIMED', message: 'Bugün zaten hediyenizi aldınız.' };
      }

      const currentCredits: number = data.credits ?? 0;
      const newBalance = currentCredits + DAILY_GIFT_AMOUNT;

      // Atomik güncelleme: hem bakiye hem tarih
      tx.update(userRef(uid), {
        credits: newBalance,
        lastGiftClaimedAt: new Date().toISOString(),
      });

      tx.set(txRef(uid, operationId), {
        uid,
        operation: 'daily_gift',
        amount: DAILY_GIFT_AMOUNT,
        operationId,
        detail: `Günlük hediye — ${today}`,
        balanceAfter: newBalance,
        createdAt: FieldValue.serverTimestamp(),
      });

      return { balanceAfter: newBalance };
    });

    return { success: true, amount: DAILY_GIFT_AMOUNT, balanceAfter: result.balanceAfter };
  } catch (err: any) {
    if (err?.code === 'ALREADY_CLAIMED') throw err;
    if (err?.code === 'USER_NOT_FOUND') throw err;
    throw err;
  }
}

/**
 * Reklam ödülü jetonu ekler.
 * KAPALI TEST: simulation modunda gerçek Firestore kredisi YAZMAZ.
 * Gerçek AdMob production doğrulaması hazır olana kadar
 * bu fonksiyon simülasyon modunu kontrol eder.
 */
export async function grantAdReward(
  uid: string,
  operationId: string,
  mode: 'simulation' | 'production'
): Promise<{ balanceAfter: number; simulated: boolean }> {
  if (mode === 'simulation') {
    // Simülasyon modunda gerçek kredi YAZILMAZ
    return { balanceAfter: -1, simulated: true };
  }

  // TODO(prod): AdMob server-side verification (SSV) callback ile
  // reward doğrulanana kadar production moda GEÇMEYİN.
  // Bkz: https://developers.google.com/admob/android/rewarded-video-ssv

  const result = await addCredits(
    uid, AD_REWARD_AMOUNT, operationId, 'ad_reward',
    'Reklam ödülü'
  );

  return { balanceAfter: result.balanceAfter, simulated: false };
}
