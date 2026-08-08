/**
 * Firebase Configuration — Aura Stories
 *
 * Auth (Email/Password + Google) ve Firestore bağlantısı.
 * Tüm yapılandırma .env.local üzerinden okunur.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  getFirestore,
  doc,
  doc as firestoreDoc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ── Auth Persistence ────────────────────────────────────────

/** Tarayıcı kapatılıp açıldığında Firebase oturumunu korur. */
export const authPersistenceReady = setPersistence(auth, browserLocalPersistence);

// ── Auth Helpers ────────────────────────────────────────────

export async function firebaseLogin(email: string, password: string) {
  await authPersistenceReady;
  return signInWithEmailAndPassword(auth, email, password);
}

export async function firebaseRegister(email: string, password: string) {
  await authPersistenceReady;
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function firebaseGoogleLogin() {
  return signInWithPopup(auth, googleProvider);
}

export async function firebaseLogout() {
  return signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// ── Firestore User Profile ──────────────────────────────────

export interface FirestoreUser {
  uid: string;
  email: string;
  name: string;
  credits: number;
  role: 'user' | 'admin';
  createdAt: any;
  level: number;
  readHours: number;
  wordsRead: number;
  streak: number;
  lastGiftClaimedAt: string | null;
  vipUntil: string | null;
}

export async function getFirestoreUser(uid: string): Promise<FirestoreUser | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as FirestoreUser) : null;
}

export async function createFirestoreUser(
  uid: string,
  email: string,
  name: string
): Promise<FirestoreUser> {
  // Firestore rules, server-authoritative alanların ilk kullanıcı belgesinde
  // açıkça bulunmasını bekliyor. vipUntil eksik olduğunda Firebase Auth hesabı
  // oluşuyor fakat profil belgesi reddediliyor; bu da sonraki kayıt denemesinde
  // "email-already-in-use" hatasına yol açıyordu.
  const user: FirestoreUser = {
    uid,
    email,
    name,
    credits: 200,
    role: 'user',
    createdAt: serverTimestamp(),
    level: 1,
    readHours: 0,
    wordsRead: 0,
    streak: 0,
    lastGiftClaimedAt: null,
    vipUntil: null,
  };
  await setDoc(doc(db, 'users', uid), user);
  return user;
}

/** Bugün hediye alınmış mı? */
export function isGiftClaimedToday(lastClaimedAt: string | null | undefined): boolean {
  if (!lastClaimedAt) return false;
  const claimed = new Date(lastClaimedAt);
  const now = new Date();
  return (
    claimed.getFullYear() === now.getFullYear() &&
    claimed.getMonth() === now.getMonth() &&
    claimed.getDate() === now.getDate()
  );
}

export function onUserSnapshot(
  uid: string,
  callback: (user: FirestoreUser | null) => void
) {
  return onSnapshot(firestoreDoc(db, 'users', uid), (snap) => {
    callback(snap.exists() ? (snap.data() as FirestoreUser) : null);
  });
}

import { collection, query, getDocs } from 'firebase/firestore';
import type { Story, Category } from '@/lib/types';

// ── Stories (Firestore Collection) ──────────────────────────

export async function getStories(): Promise<Story[]> {
  try {
    const snap = await getDocs(collection(db, 'stories'));
    return snap.docs.map(d => d.data() as Story);
  } catch (err) {
    console.warn('[Firestore] Hikayeler yüklenemedi:', err);
    return [];
  }
}

export function onStoriesSnapshot(callback: (stories: Story[]) => void) {
  return onSnapshot(
    collection(db, 'stories'),
    (snap) => {
      callback(snap.docs.map(d => d.data() as Story));
    },
    (err) => {
      console.warn('[Firestore] Hikaye dinleyicisi hatası:', err);
      callback([]);
    }
  );
}

export async function getCategories(): Promise<Category[]> {
  try {
    const snap = await getDocs(collection(db, 'categories'));
    return snap.docs.map(d => d.data() as Category);
  } catch (err) {
    console.warn('[Firestore] Kategoriler yüklenemedi:', err);
    return [];
  }
}

export async function seedStoriesToFirestore(stories: Story[], categories: Category[]) {
  const { setDoc: seedSetDoc } = await import('firebase/firestore');
  for (const cat of categories) {
    await seedSetDoc(firestoreDoc(db, 'categories', cat.id), cat);
  }
  for (const story of stories) {
    await seedSetDoc(firestoreDoc(db, 'stories', story.id), story);
  }
}

// ── Reading Progress (Firestore) ───────────────────────────

export interface StoryProgress {
  activeChapter: number;
  fateChoices: { chapterNumber: number; selectedOption: string; optionText: string; isForceChoice: boolean }[];
  generatedChapters: { chapterNumber: number; title: string; content: string; optionA: string; optionB: string }[];
}

export async function loadAllProgress(uid: string): Promise<Record<string, StoryProgress>> {
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'progress'));
    const progress: Record<string, StoryProgress> = {};
    snap.docs.forEach(d => { progress[d.id] = d.data() as StoryProgress; });
    return progress;
  } catch { return {}; }
}

export async function saveProgress(uid: string, storyId: string, progress: StoryProgress): Promise<void> {
  try {
    await setDoc(firestoreDoc(db, 'users', uid, 'progress', storyId), progress);
  } catch (err) { console.warn('[Firestore] Progress kaydedilemedi:', err); }
}

// ── Chat History (Firestore) ──────────────────────────────

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'character' | 'user' | 'system';
  timestamp: string;
}

export async function loadChatHistory(
  uid: string, storyId: string, characterId: string
): Promise<ChatMessage[]> {
  try {
    const snap = await getDocs(
      collection(db, 'users', uid, 'chats', storyId, characterId, 'messages')
    );
    return snap.docs.map(d => d.data() as ChatMessage)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch { return []; }
}

export async function saveChatMessage(
  uid: string, storyId: string, characterId: string, message: ChatMessage
): Promise<void> {
  try {
    await setDoc(
      firestoreDoc(db, 'users', uid, 'chats', storyId, characterId, 'messages', message.id),
      message
    );
  } catch (err) { console.warn('[Firestore] Mesaj kaydedilemedi:', err); }
}

// ── Reading Journal (Firestore) ─────────────────────────────

export interface JournalEntry {
  date: string;
  storyId: string;
  storyTitle: string;
  chapterNumber: number;
  minutesRead: number;
  emotion: string;
  quote: string;
}

export async function saveJournalEntry(uid: string, entry: JournalEntry): Promise<void> {
  try {
    await setDoc(firestoreDoc(db, 'users', uid, 'journal', entry.date), entry);
  } catch (err) { console.warn('[Firestore] Günlük kaydedilemedi:', err); }
}

export async function getJournalEntries(uid: string): Promise<JournalEntry[]> {
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'journal'));
    return snap.docs.map(d => d.data() as JournalEntry)
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch { return []; }
}

export { auth, db, app };

// ── Entitlements (server-authoritative) ───────────────────────

export interface StoryEntitlement {
  hasFullAccess: boolean;
  unlockedChapters: number[];
  updatedAt?: string;
}

export async function getEntitlement(uid: string, storyId: string): Promise<StoryEntitlement | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'entitlements', storyId));
    return snap.exists() ? (snap.data() as StoryEntitlement) : null;
  } catch { return null; }
}

export async function loadAllEntitlements(uid: string): Promise<Record<string, StoryEntitlement>> {
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'entitlements'));
    const result: Record<string, StoryEntitlement> = {};
    snap.docs.forEach(d => { result[d.id] = d.data() as StoryEntitlement; });
    return result;
  } catch { return {}; }
}

export function onEntitlementSnapshot(
  uid: string,
  storyId: string,
  callback: (entitlement: StoryEntitlement | null) => void
) {
  return onSnapshot(doc(db, 'users', uid, 'entitlements', storyId), (snap) => {
    callback(snap.exists() ? (snap.data() as StoryEntitlement) : null);
  });
}

export function onEntitlementsSnapshot(
  uid: string,
  callback: (entitlements: Record<string, StoryEntitlement>) => void
) {
  return onSnapshot(collection(db, 'users', uid, 'entitlements'), (snap) => {
    const result: Record<string, StoryEntitlement> = {};
    snap.docs.forEach(d => { result[d.id] = d.data() as StoryEntitlement; });
    callback(result);
  });
}

// ── Content Reporting (AI moderation) ─────────────────────────

export interface ContentReport {
  uid: string;
  storyId: string;
  storyTitle: string;
  chapterNumber?: number;
  contentType: 'story' | 'chat';
  characterName?: string;
  contentPreview: string;
  messageId?: string;
  reason: string;
  createdAt: string;
}

export async function submitContentReport(report: ContentReport): Promise<void> {
  try {
    const { collection, addDoc } = await import('firebase/firestore');

    const payload: Record<string, unknown> = {
      uid: report.uid,
      storyId: report.storyId,
      storyTitle: report.storyTitle,
      contentType: report.contentType,
      contentPreview: report.contentPreview,
      reason: report.reason,
      createdAt: report.createdAt || new Date().toISOString(),
    };

    if (report.chapterNumber != null) payload.chapterNumber = report.chapterNumber;
    if (report.characterName) payload.characterName = report.characterName;
    if (report.messageId) payload.messageId = report.messageId;

    await addDoc(collection(db, 'contentReports'), payload);
  } catch (err) {
    console.warn('[Firestore] İçerik raporu kaydedilemedi:', err);
    throw err;
  }
}
