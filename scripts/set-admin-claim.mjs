#!/usr/bin/env node
/**
 * Firebase Admin Custom Claim Setter
 *
 * Kullanım:
 *   node scripts/set-admin-claim.mjs <UID>
 *
 * Gereksinimler:
 *   - Firebase Admin SDK (Application Default Credentials)
 *   - firebase-admin npm paketi (functions/node_modules üzerinden)
 *
 * Service account secret'ı REPOYA KOYMAZ.
 * GOOGLE_APPLICATION_CREDENTIALS veya gcloud auth kullanır.
 *
 * Örnek:
 *   GOOGLE_APPLICATION_CREDENTIALS=service-account.json node scripts/set-admin-claim.mjs abc123
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const uid = process.argv[2];

if (!uid || uid === '--help' || uid === '-h') {
  console.error('Kullanım: node scripts/set-admin-claim.mjs <UID>');
  console.error('');
  console.error('Admin custom claim atar: { admin: true }');
  console.error('');
  console.error('Gereksinimler:');
  console.error('  1. Firebase Admin SDK kurulu olmalı');
  console.error('  2. GOOGLE_APPLICATION_CREDENTIALS ortam değişkeni');
  console.error('     veya gcloud auth application-default login');
  console.error('');
  console.error('Örnek:');
  console.error('  GOOGLE_APPLICATION_CREDENTIALS=sa.json node scripts/set-admin-claim.mjs UID123');
  process.exit(1);
}

// UID format kontrolü
if (!/^[a-zA-Z0-9_-]{10,128}$/.test(uid)) {
  console.error(`HATA: Geçersiz UID formatı: "${uid}"`);
  console.error('UID 10-128 karakter, alfanümerik + tire/alt çizgi olmalıdır.');
  process.exit(1);
}

async function main() {
  // Firebase Admin SDK'yı başlat
  if (getApps().length === 0) {
    // Service account dosyası varsa onu kullan
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      initializeApp({
        credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
      });
    } else {
      // Application Default Credentials
      try {
        initializeApp();
      } catch (err) {
        console.error('HATA: Firebase Admin SDK başlatılamadı.');
        console.error('GOOGLE_APPLICATION_CREDENTIALS tanımlı değil ve');
        console.error('Application Default Credentials bulunamadı.');
        console.error('');
        console.error('Çözüm:');
        console.error('  1. Service account JSON indir: Firebase Console → Project Settings → Service Accounts');
        console.error('  2. GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json node scripts/set-admin-claim.mjs <UID>');
        process.exit(1);
      }
    }
  }

  try {
    await getAuth().setCustomUserClaims(uid, { admin: true });
    console.log(`✓ Admin claim başarıyla atandı: uid=${uid}`);
    console.log('  claims: { admin: true }');
    console.log('');
    console.log('Doğrulamak için:');
    console.log(`  firebase auth:export --filter-uid ${uid} --format json`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.error(`HATA: Kullanıcı bulunamadı: "${uid}"`);
    } else if (err.code === 'auth/insufficient-permission') {
      console.error('HATA: Yetersiz izin. Service account\'ta "Firebase Admin" rolü olmalı.');
    } else {
      console.error('HATA:', err.message || String(err));
    }
    process.exit(1);
  }
}

main();
