/**
 * Server-Authoritative Economy Module — v3.0.0
 *
 * TÜM jeton işlemleri Firestore transaction içinde atomik olarak yapılır.
 * İstemci amount, detail, mode veya herhangi bir ekonomik parametre GÖNDEREMEZ.
 * Maliyetler sunucu sabitlerinden okunur, istemci yalnızca action enum gönderir.
 *
 * Action'lar:
 *   chat_message    — 5 jeton
 *   chapter_unlock  — 15 jeton
 *   force_fate      — 50 jeton
 *   full_access     — 75 jeton
 *
 * Ledger status akışı:
 *   pending → completed | refunded | failed
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ── Sabitler ──────────────────────────────────────────────────

export const COST = {
  chat_message: 5,
  chapter_unlock: 15,
  force_fate: 50,
  full_access: 75,
} as const;

export type EconomyAction = keyof typeof COST;

export const DAILY_GIFT_AMOUNT = 50;
export const INITIAL_CREDITS = 200;

// ── Ledger Types ──────────────────────────────────────────────

export type LedgerStatus = 'pending' | 'completed' | 'refunded' | 'failed';

export interface LedgerEntry {
  uid: string;
  operationId: string;
  action: EconomyAction | 'daily_gift' | 'ad_reward' | 'refund';
  cost: number;
  storyId?: string;
  /** Yalnızca AI çağrılarında: iade için kaynak operationId */
  parentOperationId?: string;
  status: LedgerStatus;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: FieldValue;
  completedAt?: FieldValue;
  /** Tamamlanan AI yanıtının hash'i veya özeti */
  resultDigest?: string;
}

// ── Firestore helpers ─────────────────────────────────────────

let _db: ReturnType<typeof getFirestore> | null = null;
function db() { if (!_db) _db = getFirestore(); return _db; }

function userRef(uid: string) { return db().collection('users').doc(uid); }
function txLedgerRef(uid: string, opId: string) {
  return db().collection('users').doc(uid).collection('transactions').doc(opId);
}
function entitlementRef(uid: string, storyId: string) {
  return db().collection('users').doc(uid).collection('entitlements').doc(storyId);
}

// ═══════════════════════════════════════════════════════════════
// CORE: Transaction-içi kredi rezervasyonu
// ═══════════════════════════════════════════════════════════════

export interface ReserveResult {
  balanceAfter: number;
  balanceBefore: number;
  alreadyReserved: boolean;
  /** Daha önce rezerve edilmişse mevcut ledger */
  existingLedger?: LedgerEntry;
}

/**
 * Kredi rezerve eder (PENDING ledger oluşturur).
 * TÜM idempotency kontrolü transaction İÇİNDE yapılır.
 *
 * Aynı operationId ile tekrar çağrılırsa:
 * - Aynı action/cost/storyId → mevcut ledger döner, ücretlendirilmez
 * - Farklı action/cost → FAILED_PRECONDITION
 */
export async function reserveCredits(
  uid: string,
  action: EconomyAction,
  operationId: string,
  storyId?: string
): Promise<ReserveResult> {
  const cost = COST[action];

  try {
    return await db().runTransaction(async (tx) => {
      // 1. Ledger kontrolü (transaction içinde)
      const existingSnap = await tx.get(txLedgerRef(uid, operationId));
      const existing = existingSnap.exists ? existingSnap.data() as LedgerEntry : null;

      if (existing) {
        // Idempotency: aynı işlem tekrar gelirse
        if (existing.action === action && existing.cost === cost && existing.storyId === (storyId || existing.storyId)) {
          if (existing.status === 'completed') {
            // Zaten tamamlanmış — duplicate, AI tekrar çalıştırılmaz
            return { balanceAfter: existing.balanceAfter, balanceBefore: existing.balanceBefore, alreadyReserved: true, existingLedger: existing };
          }
          if (existing.status === 'pending') {
            // Aynı anda ikinci çağrı — pending'i dön
            return { balanceAfter: existing.balanceAfter, balanceBefore: existing.balanceBefore, alreadyReserved: true, existingLedger: existing };
          }
          if (existing.status === 'refunded' || existing.status === 'failed') {
            // İade edilmiş/başarısız işlem tekrar kullanılamaz
            throw { code: 'ALREADY_FINALIZED', message: 'Bu işlem daha önce sonuçlandı, yeni operationId ile tekrar deneyin.' };
          }
        } else {
          // Aynı operationId farklı parametrelerle → reddet
          throw { code: 'IDEMPOTENCY_MISMATCH', message: `Aynı operationId farklı parametrelerle geldi. Beklenen: ${existing.action}/${existing.cost}, gelen: ${action}/${cost}.` };
        }
      }

      // 2. Kullanıcı bakiyesini oku
      const userSnap = await tx.get(userRef(uid));
      if (!userSnap.exists) throw { code: 'USER_NOT_FOUND' };

      const data = userSnap.data()!;
      const currentCredits: number = data.credits ?? 0;

      if (currentCredits < cost) {
        throw { code: 'INSUFFICIENT_CREDITS', current: currentCredits, needed: cost };
      }

      const newBalance = currentCredits - cost;

      // 3. Atomik: bakiye düş + PENDING ledger oluştur
      tx.update(userRef(uid), { credits: newBalance });

      tx.set(txLedgerRef(uid, operationId), {
        uid,
        operationId,
        action,
        cost,
        storyId: storyId || null,
        status: 'pending',
        balanceBefore: currentCredits,
        balanceAfter: newBalance,
        createdAt: FieldValue.serverTimestamp(),
      });

      return { balanceAfter: newBalance, balanceBefore: currentCredits, alreadyReserved: false };
    });
  } catch (err: any) {
    // Kodlu hataları yeniden fırlat
    if (err?.code) throw err;
    throw { code: 'TRANSACTION_FAILED', message: err?.message };
  }
}

/**
 * PENDING ledger'ı COMPLETED olarak işaretler.
 * Yalnızca status == 'pending' ise çalışır.
 * @deprecated Yeni kod finalizeTransaction kullanmalı.
 */
export async function completeTransaction(
  uid: string,
  operationId: string,
  resultDigest?: string
): Promise<void> {
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(txLedgerRef(uid, operationId));
    if (!snap.exists) return;
    const entry = snap.data() as LedgerEntry;
    if (entry.status !== 'pending') return;
    tx.update(txLedgerRef(uid, operationId), {
      status: 'completed', completedAt: FieldValue.serverTimestamp(),
      ...(resultDigest ? { resultDigest } : {}),
    });
  });
}

/**
 * ATOMİK FINALIZE: ledger tamamlama + entitlement güncelleme
 * TEK Firestore transaction içinde yapılır.
 * Entitlement başarısızsa ledger completed OLMAZ.
 */
export async function finalizeTransaction(
  uid: string,
  operationId: string,
  storyId: string,
  action: 'chapter_unlock' | 'force_fate' | 'full_access',
  chapterNumber?: number,
  resultDigest?: string
): Promise<void> {
  await db().runTransaction(async (tx) => {
    // 1. Ledger'ı oku ve doğrula
    const snap = await tx.get(txLedgerRef(uid, operationId));
    if (!snap.exists) throw { code: 'LEDGER_NOT_FOUND' };
    const entry = snap.data() as LedgerEntry;
    if (entry.status !== 'pending') throw { code: 'NOT_PENDING' };

    // 2. Entitlement'ı güncelle
    const eref = entitlementRef(uid, storyId);
    const esnap = await tx.get(eref);
    const current = esnap.exists ? esnap.data()! : { hasFullAccess: false, unlockedChapters: [] as number[] };
    const unlocked: number[] = [...(current.unlockedChapters || [])];

    if (action === 'full_access') {
      tx.set(eref, { hasFullAccess: true, unlockedChapters: unlocked, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    } else if (chapterNumber != null && !unlocked.includes(chapterNumber)) {
      unlocked.push(chapterNumber);
      tx.set(eref, { unlockedChapters: unlocked, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }

    // 3. Ledger'ı completed yap
    tx.update(txLedgerRef(uid, operationId), {
      status: 'completed', completedAt: FieldValue.serverTimestamp(),
      ...(resultDigest ? { resultDigest } : {}),
    });
  });
}

export async function finalizeSimpleTransaction(
  uid: string,
  operationId: string,
  resultDigest?: string
): Promise<void> {
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(txLedgerRef(uid, operationId));
    if (!snap.exists) return;
    const entry = snap.data() as LedgerEntry;
    if (entry.status !== 'pending') return;
    tx.update(txLedgerRef(uid, operationId), {
      status: 'completed', completedAt: FieldValue.serverTimestamp(),
      ...(resultDigest ? { resultDigest } : {}),
    });
  });
}

/**
 * PENDING ledger'ı REFUNDED yapar ve bakiyeyi İADE eder.
 * Transaction içinde atomiktir — çift iade İMKANSIZDIR.
 * Yalnızca status == 'pending' ise çalışır.
 */
export async function refundTransaction(
  uid: string,
  operationId: string
): Promise<boolean> {
  try {
    return await db().runTransaction(async (tx) => {
      const snap = await tx.get(txLedgerRef(uid, operationId));
      if (!snap.exists) return false;

      const entry = snap.data() as LedgerEntry;
      if (entry.status !== 'pending') return false; // Zaten sonuçlanmış — iade yok

      // Kullanıcı bakiyesini oku
      const userSnap = await tx.get(userRef(uid));
      const currentCredits: number = userSnap.exists ? (userSnap.data()?.credits ?? 0) : 0;
      const refundedBalance = currentCredits + entry.cost;

      // Atomik: bakiye iadesi + ledger güncelleme
      tx.update(userRef(uid), { credits: refundedBalance });

      const refundOpId = `refund_${operationId}`;

      tx.update(txLedgerRef(uid, operationId), {
        status: 'refunded',
        completedAt: FieldValue.serverTimestamp(),
      });

      // İade kaydı
      tx.set(txLedgerRef(uid, refundOpId), {
        uid,
        operationId: refundOpId,
        action: 'refund',
        cost: entry.cost,
        parentOperationId: operationId,
        status: 'completed',
        balanceBefore: currentCredits,
        balanceAfter: refundedBalance,
        createdAt: FieldValue.serverTimestamp(),
        completedAt: FieldValue.serverTimestamp(),
      });

      return true;
    });
  } catch {
    return false;
  }
}

/**
 * Daha önce COMPLETED olan bir ledger'ı sorgular.
 * AI replay koruması: tamamlanmış işlem tekrar çağrılırsa sonuç dönebilir.
 */
export async function getCompletedLedger(
  uid: string,
  operationId: string
): Promise<LedgerEntry | null> {
  const snap = await txLedgerRef(uid, operationId).get();
  if (!snap.exists) return null;
  const entry = snap.data() as LedgerEntry;
  return entry.status === 'completed' ? entry : null;
}

// ═══════════════════════════════════════════════════════════════
// DAILY GIFT
// ═══════════════════════════════════════════════════════════════

export async function claimDailyGift(
  uid: string,
  operationId: string
): Promise<{ amount: number; balanceAfter: number }> {
  const today = new Date().toISOString().slice(0, 10);

  return await db().runTransaction(async (tx) => {
    // Idempotency
    const existingSnap = await tx.get(txLedgerRef(uid, operationId));
    if (existingSnap.exists) {
      const e = existingSnap.data() as LedgerEntry;
      return { amount: DAILY_GIFT_AMOUNT, balanceAfter: e.balanceAfter };
    }

    const userSnap = await tx.get(userRef(uid));
    if (!userSnap.exists) throw { code: 'USER_NOT_FOUND' };

    const data = userSnap.data()!;
    const lastClaimed: string | null = data.lastGiftClaimedAt ?? null;
    const lastDay = lastClaimed ? lastClaimed.slice(0, 10) : null;
    if (lastDay === today) throw { code: 'ALREADY_CLAIMED' };

    const current = data.credits ?? 0;
    const newBalance = current + DAILY_GIFT_AMOUNT;

    tx.update(userRef(uid), {
      credits: newBalance,
      lastGiftClaimedAt: new Date().toISOString(),
    });

    tx.set(txLedgerRef(uid, operationId), {
      uid, operationId, action: 'daily_gift', cost: DAILY_GIFT_AMOUNT,
      status: 'completed', balanceBefore: current, balanceAfter: newBalance,
      createdAt: FieldValue.serverTimestamp(), completedAt: FieldValue.serverTimestamp(),
    });

    return { amount: DAILY_GIFT_AMOUNT, balanceAfter: newBalance };
  });
}

// ═══════════════════════════════════════════════════════════════
// ENTITLEMENTS (server-only writes)
// ═══════════════════════════════════════════════════════════════

export async function grantEntitlement(
  uid: string,
  storyId: string,
  action: 'chapter_unlock' | 'force_fate' | 'full_access',
  chapterNumber?: number
): Promise<void> {
  await db().runTransaction(async (tx) => {
    const ref = entitlementRef(uid, storyId);
    const snap = await tx.get(ref);
    const current = snap.exists ? snap.data()! : { hasFullAccess: false, unlockedChapters: [] as number[] };

    const unlocked: number[] = [...(current.unlockedChapters || [])];

    if (action === 'full_access') {
      tx.set(ref, { hasFullAccess: true, unlockedChapters: unlocked, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    } else if (chapterNumber != null && !unlocked.includes(chapterNumber)) {
      unlocked.push(chapterNumber);
      tx.set(ref, { unlockedChapters: unlocked, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// AD REWARD (her zaman simülasyon — SSV yok)
// ═══════════════════════════════════════════════════════════════

/**
 * Reklam ödülü — KAPALI TEST: her zaman simülasyon.
 * Gerçek Firestore kredisi YAZILMAZ.
 * AdMob SSV uygulanana kadar production moda GEÇİLMEZ.
 */
export async function grantAdReward(): Promise<{ balanceAfter: number; simulated: true }> {
  // TODO(prod): AdMob server-side verification (SSV) callback
  // uygulanana kadar gerçek kredi YAZILMAZ.
  // Bkz: https://developers.google.com/admob/android/rewarded-video-ssv
  return { balanceAfter: -1, simulated: true };
}
