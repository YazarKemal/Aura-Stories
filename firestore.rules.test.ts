/**
 * Firestore Rules Emulator Testleri — Modular API v4
 *
 * Gereksinimler:
 *   npm install --save-dev @firebase/rules-unit-testing firebase-tools tsx
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
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  addDoc,
} from 'firebase/firestore';

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

async function seedUser(uid: string) {
  const db = testEnv.authenticatedContext(uid).firestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), {
      uid, email: 'test@test.com', name: 'Test',
      role: 'user', credits: 200, createdAt: new Date().toISOString(),
      level: 1, readHours: 0, wordsRead: 0, streak: 0,
      lastGiftClaimedAt: null, vipUntil: null,
    });
  });
}

// ═══════════════════════════════════════════════════════════════

describe('users/{uid} — create', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('geçerli kullanıcı create', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', 'user1'), {
        uid: 'user1', email: 'test@test.com', name: 'Test',
        role: 'user', credits: 200, createdAt: new Date().toISOString(),
        level: 1, readHours: 0, wordsRead: 0, streak: 0,
        lastGiftClaimedAt: null, vipUntil: null,
      })
    );
  });

  it('credits != 200 create reddedilir', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      setDoc(doc(db, 'users', 'user1'), {
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
      setDoc(doc(db, 'users', 'user1'), {
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
      setDoc(doc(db, 'users', 'user2'), {
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
    await seedUser('user1');
  });
  afterEach(teardown);

  it('kullanıcı credits değiştiremez', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      updateDoc(doc(db, 'users', 'user1'), { credits: 9999 })
    );
  });

  it('kullanıcı vipUntil değiştiremez', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      updateDoc(doc(db, 'users', 'user1'), { vipUntil: '2099-01-01' })
    );
  });

  it('kullanıcı admin claim taklit edemez', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      updateDoc(doc(db, 'users', 'user1'), { role: 'admin' })
    );
  });
});

describe('rateLimits — yazılamaz', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('kullanıcı rateLimits yazamaz', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      setDoc(doc(db, 'users', 'user1', 'rateLimits', 'test'), { count: 0 })
    );
  });
});

describe('transactions — yazılamaz', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('transaction ledger yazılamaz', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      setDoc(doc(db, 'users', 'user1', 'transactions', 'tx1'), { test: true })
    );
  });
});

describe('entitlements — yazılamaz', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('entitlement yazılamaz', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      setDoc(doc(db, 'users', 'user1', 'entitlements', 's1'), { hasFullAccess: true })
    );
  });
});

describe('progress — save', () => {
  beforeEach(async () => {
    await setup();
    await seedUser('user1');
  });
  afterEach(teardown);

  it('geçerli progress save başarılı', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', 'user1', 'progress', 'story1'), {
        activeChapter: 2,
        fateChoices: [],
        generatedChapters: [],
      })
    );
  });

  it('progress\'e hasFullAccess eklenemez', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      setDoc(doc(db, 'users', 'user1', 'progress', 'story1'), {
        activeChapter: 1,
        fateChoices: [],
        generatedChapters: [],
        hasFullAccess: true,
      })
    );
  });

  it('progress\'e unlockedChapters eklenemez', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      setDoc(doc(db, 'users', 'user1', 'progress', 'story1'), {
        activeChapter: 1,
        fateChoices: [],
        generatedChapters: [],
        unlockedChapters: [1, 2, 3],
      })
    );
  });
});

describe('contentReports', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('geçerli story report başarılı', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertSucceeds(
      addDoc(collection(db, 'contentReports'), {
        uid: 'user1', storyId: 's1', storyTitle: 'Test Hikaye',
        chapterNumber: 3, contentType: 'story',
        contentPreview: 'test içerik', reason: 'Spam',
        createdAt: new Date().toISOString(),
      })
    );
  });

  it('geçerli chat report başarılı', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertSucceeds(
      addDoc(collection(db, 'contentReports'), {
        uid: 'user1', storyId: 's1', storyTitle: 'Test Hikaye',
        contentType: 'chat', contentPreview: 'test içerik',
        reason: 'Spam', createdAt: new Date().toISOString(),
        characterName: 'Demir Ağa', messageId: 'msg1',
      })
    );
  });

  it('sahte uid report reddedilir', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      addDoc(collection(db, 'contentReports'), {
        uid: 'user2', storyId: 's1', storyTitle: 'Test',
        contentType: 'chat', contentPreview: 'test', reason: 'Spam',
        createdAt: new Date().toISOString(),
      })
    );
  });

  it('ekstra alan report reddedilir', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      addDoc(collection(db, 'contentReports'), {
        uid: 'user1', storyId: 's1', storyTitle: 'Test',
        contentType: 'chat', contentPreview: 'test', reason: 'Spam',
        createdAt: new Date().toISOString(),
        hackerField: 'evil',
      })
    );
  });
});

describe('admin — stories', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('admin claim story yazabilir', async () => {
    const db = testEnv.authenticatedContext('admin1', { admin: true }).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'stories', 'new-story'), { title: 'Test', author: 'Admin' })
    );
  });

  it('normal kullanıcı story yazamaz', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      setDoc(doc(db, 'stories', 'new-story'), { title: 'Hack', author: 'User' })
    );
  });
});
