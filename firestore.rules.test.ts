/**
 * Firestore Rules Emulator Testleri
 *
 * Gereksinimler:
 *   npm install --save-dev @firebase/rules-unit-testing
 *   firebase emulators:exec --only firestore "npx tsx firestore.rules.test.ts"
 *
 * CI: firebase emulators:exec --only firestore "npx tsx firestore.rules.test.ts"
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';

let testEnv: RulesTestEnvironment;

const RULES = readFileSync('firestore.rules', 'utf8');

async function setup() {
  testEnv = await initializeTestEnvironment({
    projectId: 'aura-stories-test',
    firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
  });
}

async function teardown() {
  await testEnv?.cleanup();
}

// Test helpers
function authContext(uid: string, claims: Record<string, unknown> = {}) {
  return { uid, ...claims };
}

function adminContext(uid: string) {
  return { uid, token: { admin: true } };
}

// ═══════════════════════════════════════════════════════════════

describe('users/{uid} — create', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('geçerli ilk kayıt başarılı', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertSucceeds(
      db.collection('users').doc('user1').set({
        uid: 'user1', email: 'test@test.com', name: 'Test',
        role: 'user', credits: 200, createdAt: new Date().toISOString(),
        level: 1, readHours: 0, wordsRead: 0, streak: 0,
        lastGiftClaimedAt: null, vipUntil: null,
      })
    );
  });

  it('credits != 200 ile kayıt başarısız', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      db.collection('users').doc('user1').set({
        uid: 'user1', email: 'a@a.com', name: 'A',
        role: 'user', credits: 999, createdAt: new Date().toISOString(),
        level: 1, readHours: 0, wordsRead: 0, streak: 0,
        lastGiftClaimedAt: null, vipUntil: null,
      })
    );
  });

  it('role != "user" ile kayıt başarısız', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      db.collection('users').doc('user1').set({
        uid: 'user1', email: 'a@a.com', name: 'A',
        role: 'admin', credits: 200, createdAt: new Date().toISOString(),
        level: 1, readHours: 0, wordsRead: 0, streak: 0,
        lastGiftClaimedAt: null, vipUntil: null,
      })
    );
  });

  it('başka uid ile kayıt başarısız', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      db.collection('users').doc('user2').set({
        uid: 'user2', email: 'a@a.com', name: 'A',
        role: 'user', credits: 200, createdAt: new Date().toISOString(),
        level: 1, readHours: 0, wordsRead: 0, streak: 0,
        lastGiftClaimedAt: null, vipUntil: null,
      })
    );
  });
});

describe('users/{uid} — update', () => {
  beforeEach(async () => {
    await setup();
    // Seed user
    const db = testEnv.authenticatedContext('user1').firestore();
    await db.collection('users').doc('user1').set({
      uid: 'user1', email: 'test@test.com', name: 'Test',
      role: 'user', credits: 200, createdAt: new Date().toISOString(),
      level: 1, readHours: 0, wordsRead: 0, streak: 0,
      lastGiftClaimedAt: null, vipUntil: null,
    });
  });
  afterEach(teardown);

  it('name güncellenebilir', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertSucceeds(
      db.collection('users').doc('user1').update({ name: 'New Name', email: 'test@test.com', role: 'user', credits: 200, createdAt: (await db.collection('users').doc('user1').get()).data()!.createdAt, level: 1, readHours: 0, wordsRead: 0, streak: 0, lastGiftClaimedAt: null, vipUntil: null, uid: 'user1' })
    );
  });

  it('credits değiştirilemez', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    const snap = await db.collection('users').doc('user1').get();
    const d = snap.data()!;
    await assertFails(
      db.collection('users').doc('user1').update({ credits: 9999, role: d.role, email: d.email, name: d.name, createdAt: d.createdAt, level: d.level, readHours: d.readHours, wordsRead: d.wordsRead, streak: d.streak, lastGiftClaimedAt: d.lastGiftClaimedAt, vipUntil: d.vipUntil, uid: d.uid })
    );
  });

  it('role değiştirilemez (kendini admin yapamaz)', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    const snap = await db.collection('users').doc('user1').get();
    const d = snap.data()!;
    await assertFails(
      db.collection('users').doc('user1').update({ role: 'admin', credits: d.credits, email: d.email, name: d.name, createdAt: d.createdAt, level: d.level, readHours: d.readHours, wordsRead: d.wordsRead, streak: d.streak, lastGiftClaimedAt: d.lastGiftClaimedAt, vipUntil: d.vipUntil, uid: d.uid })
    );
  });

  it('createdAt değiştirilemez', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    const snap = await db.collection('users').doc('user1').get();
    const d = snap.data()!;
    await assertFails(
      db.collection('users').doc('user1').update({ createdAt: '2020-01-01', credits: d.credits, role: d.role, email: d.email, name: d.name, level: d.level, readHours: d.readHours, wordsRead: d.wordsRead, streak: d.streak, lastGiftClaimedAt: d.lastGiftClaimedAt, vipUntil: d.vipUntil, uid: d.uid })
    );
  });

  it('vipUntil değiştirilemez', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    const snap = await db.collection('users').doc('user1').get();
    const d = snap.data()!;
    await assertFails(
      db.collection('users').doc('user1').update({ vipUntil: '2099-01-01', credits: d.credits, role: d.role, email: d.email, name: d.name, createdAt: d.createdAt, level: d.level, readHours: d.readHours, wordsRead: d.wordsRead, streak: d.streak, lastGiftClaimedAt: d.lastGiftClaimedAt, uid: d.uid })
    );
  });
});

describe('rateLimits — server-only', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('kullanıcı rate limit yazamaz', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      db.collection('users').doc('user1').collection('rateLimits').doc('test').set({ count: 0 })
    );
  });
});

describe('transactions — server-only', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('kullanıcı transaction yazamaz', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      db.collection('users').doc('user1').collection('transactions').doc('tx1').set({ test: true })
    );
  });
});

describe('entitlements — server-only', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('kullanıcı entitlement yazamaz (hasFullAccess açamaz)', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      db.collection('users').doc('user1').collection('entitlements').doc('s1').set({ hasFullAccess: true })
    );
  });
});

describe('contentReports', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('geçerli rapor başarılı', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertSucceeds(
      db.collection('contentReports').add({
        uid: 'user1', storyId: 's1', storyTitle: 'Test Hikaye',
        contentType: 'chat', contentPreview: 'test içerik',
        reason: 'Spam', createdAt: new Date().toISOString(),
      })
    );
  });

  it('sahte uid ile başarısız', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      db.collection('contentReports').add({
        uid: 'user2', storyId: 's1', storyTitle: 'Test',
        contentType: 'chat', contentPreview: 'test', reason: 'Spam',
        createdAt: new Date().toISOString(),
      })
    );
  });

  it('ekstra alan ile başarısız', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      db.collection('contentReports').add({
        uid: 'user1', storyId: 's1', storyTitle: 'Test',
        contentType: 'chat', contentPreview: 'test', reason: 'Spam',
        createdAt: new Date().toISOString(),
        hackerField: 'evil',
      })
    );
  });
});

describe('admin — custom claims', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('admin stories yazabilir', async () => {
    const db = testEnv.authenticatedContext('admin1', { admin: true }).firestore();
    await assertSucceeds(
      db.collection('stories').doc('new-story').set({ title: 'Test', author: 'Admin' })
    );
  });

  it('normal kullanıcı stories yazamaz', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      db.collection('stories').doc('new-story').set({ title: 'Hack', author: 'User' })
    );
  });
});

// Not: Bu testler firebase emulator gerektirir.
// Çalıştırma: firebase emulators:exec --only firestore "npx tsx firestore.rules.test.ts"
