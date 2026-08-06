/**
 * Economy Emulator Integration Testleri — v3.0.0
 *
 * Firestore emulator + Firebase Admin SDK kullanarak gerçek transaction
 * testleri. DeepSeek API'ye gerçek ağ çağrısı YAPILMAZ.
 *
 * Çalıştırma:
 *   firebase emulators:exec --only firestore "npx tsx functions/src/economy.integration.test.ts"
 *
 * CI:
 *   firebase emulators:exec --only firestore "npx tsx functions/src/economy.integration.test.ts"
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ── Emulator Setup ──────────────────────────────────────────────

const PROJECT_ID = 'aura-stories-test';

function initAdmin() {
  if (getApps().length === 0) {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    initializeApp({ projectId: PROJECT_ID });
  }
}

function db() { return getFirestore(); }

async function seedUser(uid: string, credits = 200) {
  await db().collection('users').doc(uid).set({
    uid, email: `${uid}@test.com`, name: 'Test User',
    role: 'user', credits, createdAt: FieldValue.serverTimestamp(),
    level: 1, readHours: 0, wordsRead: 0, streak: 0,
    lastGiftClaimedAt: null, vipUntil: null,
  });
}

async function clearAll() {
  // Tüm koleksiyonları temizle
  const usersSnap = await db().collection('users').get();
  for (const userDoc of usersSnap.docs) {
    // Alt koleksiyonları temizle
    const subCollections = ['transactions', 'entitlements', 'progress', 'rateLimits'];
    for (const sub of subCollections) {
      const subSnap = await userDoc.ref.collection(sub).get();
      for (const d of subSnap.docs) { await d.ref.delete(); }
    }
    await userDoc.ref.delete();
  }
}

// ── Tests ────────────────────────────────────────────────────────

describe('reserveCredits — tek çağrı tek düşüm', () => {
  beforeEach(async () => {
    initAdmin();
    await clearAll();
    await seedUser('user1', 200);
  });

  it('başarılı rezervasyon — bakiye 200→185', async () => {
    const { reserveCredits } = await import('./economy');
    const r = await reserveCredits('user1', 'chapter_unlock', 'op-1', 'story1');
    assert.equal(r.alreadyReserved, false);
    assert.equal(r.balanceBefore, 200);
    assert.equal(r.balanceAfter, 185);

    // Bakiyeyi doğrula
    const userSnap = await db().collection('users').doc('user1').get();
    assert.equal(userSnap.data()!.credits, 185);
  });
});

describe('reserveCredits — idempotency', () => {
  beforeEach(async () => {
    initAdmin();
    await clearAll();
    await seedUser('user1', 200);
  });

  it('aynı operationId ile 20 paralel çağrı yalnızca bir kez düşürür', async () => {
    const { reserveCredits } = await import('./economy');
    const promises = Array.from({ length: 20 }, () =>
      reserveCredits('user1', 'chat_message', 'idem-1')
    );
    const results = await Promise.allSettled(promises);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    // Hepsi başarılı dönmeli (bazıları alreadyReserved)
    assert.ok(fulfilled.length === 20);

    // Sadece birinde alreadyReserved=false
    const fresh = fulfilled.filter((r: any) => !r.value.alreadyReserved);
    assert.equal(fresh.length, 1);

    // Bakiye sadece bir kez düşmüş olmalı: 200 - 5 = 195
    const userSnap = await db().collection('users').doc('user1').get();
    assert.equal(userSnap.data()!.credits, 195);
  });

  it('aynı operationId farklı action reddedilir', async () => {
    const { reserveCredits } = await import('./economy');
    await reserveCredits('user1', 'chapter_unlock', 'op-fail', 'story1');

    try {
      await reserveCredits('user1', 'force_fate', 'op-fail', 'story1');
      assert.fail('Hata fırlatmalıydı');
    } catch (err: any) {
      assert.equal(err.code, 'IDEMPOTENCY_MISMATCH');
    }
  });

  it('yetersiz bakiye reddedilir', async () => {
    // 50 kredili ayrı bir kullanıcı — full_access (75) için yetersiz
    await seedUser('user-poor', 50);
    const { reserveCredits } = await import('./economy');
    try {
      await reserveCredits('user-poor', 'full_access', 'op-poor');
      assert.fail('Hata fırlatmalıydı');
    } catch (err: any) {
      assert.equal(err.code, 'INSUFFICIENT_CREDITS');
    }
  });
});

describe('refundTransaction — idempotency', () => {
  beforeEach(async () => {
    initAdmin();
    await clearAll();
    await seedUser('user1', 200);
  });

  it('iki paralel refund yalnızca bir kez iade eder', async () => {
    const { reserveCredits, refundTransaction } = await import('./economy');
    await reserveCredits('user1', 'force_fate', 'ref-op-1', 'story1');
    // Bakiye 150 olmalı
    const afterReserve = await db().collection('users').doc('user1').get();
    assert.equal(afterReserve.data()!.credits, 150);

    // Paralel refund
    await Promise.all([
      refundTransaction('user1', 'ref-op-1'),
      refundTransaction('user1', 'ref-op-1'),
    ]);

    // Bakiye sadece bir kez iade edilmeli: 150 + 50 = 200
    const afterRefund = await db().collection('users').doc('user1').get();
    assert.equal(afterRefund.data()!.credits, 200);
  });
});

describe('finalizeTransaction — ledger + entitlement', () => {
  beforeEach(async () => {
    initAdmin();
    await clearAll();
    await seedUser('user1', 200);
  });

  it('ledger ve entitlement birlikte tamamlanır (chapter_unlock)', async () => {
    const { reserveCredits, finalizeTransaction } = await import('./economy');
    await reserveCredits('user1', 'chapter_unlock', 'fin-1', 'story1');

    await finalizeTransaction('user1', 'fin-1', 'story1', 'chapter_unlock', 2, 'test-digest');

    // Ledger completed
    const txSnap = await db().collection('users').doc('user1').collection('transactions').doc('fin-1').get();
    assert.equal(txSnap.data()!.status, 'completed');

    // Entitlement unlocked
    const entSnap = await db().collection('users').doc('user1').collection('entitlements').doc('story1').get();
    assert.ok(entSnap.exists);
    assert.ok(entSnap.data()!.unlockedChapters.includes(2));
  });

  it('full_access entitlement hasFullAccess=true yapar', async () => {
    const { reserveCredits, finalizeTransaction } = await import('./economy');
    await reserveCredits('user1', 'full_access', 'fin-fa', 'story1');

    await finalizeTransaction('user1', 'fin-fa', 'story1', 'full_access');

    const entSnap = await db().collection('users').doc('user1').collection('entitlements').doc('story1').get();
    assert.ok(entSnap.exists);
    assert.equal(entSnap.data()!.hasFullAccess, true);
  });
});

describe('claimDailyGift — idempotency', () => {
  beforeEach(async () => {
    initAdmin();
    await clearAll();
    await seedUser('user1', 200);
  });

  it('daily gift farklı operationId ile paralel çağrıldığında tek ödül verir', async () => {
    const { claimDailyGift } = await import('./economy');
    const promises = Array.from({ length: 5 }, (_, i) =>
      claimDailyGift('user1', `gift-${i}`)
    );
    const results = await Promise.allSettled(promises);

    // Sadece biri başarılı olmalı
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    assert.equal(fulfilled.length, 1);

    // Bakiye 200 + 50 = 250 (sadece bir kez)
    const userSnap = await db().collection('users').doc('user1').get();
    assert.equal(userSnap.data()!.credits, 250);
  });
});
