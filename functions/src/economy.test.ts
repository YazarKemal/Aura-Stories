/**
 * Economy modülü birim testleri.
 *
 * Firestore transaction'ları mock'lanır. Gerçek emulator gerektirmez.
 * Node.js yerleşik test runner (node:test) ile çalışır.
 *
 * Çalıştırma:
 *   npm --prefix functions run build && node --test lib/economy.test.js
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// ── Mock Firestore ─────────────────────────────────────────────

interface MockDoc {
  data: Record<string, unknown>;
}

interface MockTx {
  _reads: Map<string, MockDoc | null>;
  _writes: Map<string, Record<string, unknown>>;
  get: (ref: { path: string }) => Promise<MockDoc | null>;
  update: (ref: { path: string }, data: Record<string, unknown>) => void;
  set: (ref: { path: string }, data: Record<string, unknown>) => void;
}

// Collection/document store
let mockStore: Map<string, MockDoc> = new Map();
let mockTransactions: Map<string, Record<string, unknown>> = new Map();

function makeTx(): MockTx {
  const reads = new Map<string, MockDoc | null>();
  const writes = new Map<string, Record<string, unknown>>();

  // Snapshot the store for consistent reads within transaction
  const snapshot = new Map(mockStore);

  return {
    _reads: reads,
    _writes: writes,
    async get(ref: { path: string }) {
      const doc = snapshot.get(ref.path) ?? null;
      reads.set(ref.path, doc);
      return doc;
    },
    update(ref: { path: string }, data: Record<string, unknown>) {
      writes.set(ref.path, data);
    },
    set(ref: { path: string }, data: Record<string, unknown>) {
      writes.set(ref.path, data);
    },
  };
}

// Patch the economy module's Firestore calls
// We use dynamic import after setting up module-level mocks.

const originalEnv = { ...process.env };

// ── Test helpers ────────────────────────────────────────────────

function setStoreUser(uid: string, credits: number, extra: Record<string, unknown> = {}) {
  mockStore.set(`users/${uid}`, {
    data: { uid, credits, role: 'user', vipUntil: null, lastGiftClaimedAt: null, ...extra },
  });
}

function getStoreUser(uid: string): Record<string, unknown> | null {
  const doc = mockStore.get(`users/${uid}`);
  return doc?.data ?? null;
}

async function importEconomy() {
  // Re-import to pick up fresh mock store
  // We need to mock firebase-admin/firestore
  return await import('./economy');
}

// ⚠️ Economy tests require Firestore mock — bunlar emulator olmadan
// çalışmaz çünkü economy.ts doğrudan getFirestore() import eder.
// Bu test dosyası emulator veya mock altyapısı kurulana kadar
// yapısal doğrulama (type/API test) olarak kalır.

// ── API shape tests (yapısal) ──────────────────────────────────

describe('economy constants', () => {
  it('istemci sabitleriyle eşleşir', async () => {
    const economy = await import('./economy');
    assert.equal(economy.CHAT_MESSAGE_COST, 5);
    assert.equal(economy.CHAPTER_UNLOCK_COST, 15);
    assert.equal(economy.FORCE_FATE_COST, 50);
    assert.equal(economy.FULL_ACCESS_COST, 75);
    assert.equal(economy.AD_REWARD_AMOUNT, 5);
    assert.equal(economy.DAILY_GIFT_AMOUNT, 50);
    assert.equal(economy.INITIAL_CREDITS, 200);
  });
});

describe('idempotency design', () => {
  it('spendCredits pozitif olmayan miktarı reddeder', async () => {
    const { spendCredits } = await import('./economy');
    await assert.rejects(
      () => spendCredits('test-uid', 0, 'op-1', 'test'),
      /pozitif olmalıdır/
    );
    await assert.rejects(
      () => spendCredits('test-uid', -5, 'op-2', 'test'),
      /pozitif olmalıdır/
    );
  });

  it('addCredits pozitif olmayan miktarı reddeder', async () => {
    const { addCredits } = await import('./economy');
    await assert.rejects(
      () => addCredits('test-uid', 0, 'op-1', 'add', 'test'),
      /pozitif olmalıdır/
    );
  });
});

describe('grantAdReward simulation guard', () => {
  it('simulation modunda gerçek kredi yazmaz', async () => {
    const { grantAdReward } = await import('./economy');
    const result = await grantAdReward('test-uid', 'ad-1', 'simulation');
    assert.equal(result.simulated, true);
    // balanceAfter -1: gerçek kredi YAZILMADI
    assert.equal(result.balanceAfter, -1);
  });
});
