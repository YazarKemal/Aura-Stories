/**
 * Economy modülü birim testleri — v3.0.0
 *
 * Node.js yerleşik test runner (node:test) ile çalışır.
 * Firestore transaction'lar mock'lanmaz — yalnızca sabitler
 * ve saf fonksiyonlar test edilir. Emulator testleri ayrıdır.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('economy constants — v3.0.0', () => {
  it('COST action maliyetleri', async () => {
    const { COST } = await import('./economy');
    assert.equal(COST.chat_message, 5);
    assert.equal(COST.chapter_unlock, 15);
    assert.equal(COST.force_fate, 50);
    assert.equal(COST.full_access, 75);
  });

  it('hediye ve başlangıç sabitleri', async () => {
    const { DAILY_GIFT_AMOUNT, INITIAL_CREDITS } = await import('./economy');
    assert.equal(DAILY_GIFT_AMOUNT, 50);
    assert.equal(INITIAL_CREDITS, 200);
  });
});

describe('grantAdReward — simulation guard', () => {
  it('her zaman simülasyon döner, gerçek kredi YAZMAZ', async () => {
    const { grantAdReward } = await import('./economy');
    const result = await grantAdReward();
    assert.equal(result.simulated, true);
    assert.equal(result.balanceAfter, -1); // gerçek kredi YOK
  });

  it('HİÇBİR parametre almaz', async () => {
    const { grantAdReward } = await import('./economy');
    // Fonksiyon sıfır argümanla çağrılabilmeli
    assert.doesNotReject(() => grantAdReward());
  });
});

describe('COST type safety', () => {
  it('COST anahtarları yalnızca tanımlı actionlar', async () => {
    const { COST } = await import('./economy');
    const keys = Object.keys(COST);
    assert.deepEqual(keys.sort(), ['chapter_unlock', 'chat_message', 'force_fate', 'full_access'].sort());
  });
});
