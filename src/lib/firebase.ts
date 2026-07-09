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
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  getFirestore,
  doc,
  doc as firestoreDoc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
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

// Singleton — SSR sırasında çift init'i engelle
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ── Auth Helpers ────────────────────────────────────────────

export async function firebaseLogin(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function firebaseRegister(email: string, password: string) {
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
  };
  await setDoc(doc(db, 'users', uid), user);
  return user;
}

/** Firestore üzerinden jeton ekle/çıkar. Atomik increment kullanır. */
export async function updateFirestoreCredits(uid: string, delta: number): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    credits: increment(delta),
  });
}

/** Günlük hediye alındı olarak işaretle. */
export async function claimDailyGift(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    lastGiftClaimedAt: new Date().toISOString(),
    credits: increment(50),
  });
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

/** Kullanıcı belgesini gerçek zamanlı dinle. Değişiklik anında callback ateşlenir. */
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

/** Tüm hikayeleri Firestore'dan çek. Hata durumunda boş dizi döner. */
export async function getStories(): Promise<Story[]> {
  try {
    const snap = await getDocs(collection(db, 'stories'));
    return snap.docs.map(d => d.data() as Story);
  } catch (err) {
    console.warn('[Firestore] Hikayeler yüklenemedi:', err);
    return [];
  }
}

/** Hikayeler koleksiyonunu gerçek zamanlı dinle. */
export function onStoriesSnapshot(callback: (stories: Story[]) => void) {
  return onSnapshot(collection(db, 'stories'), (snap) => {
    callback(snap.docs.map(d => d.data() as Story));
  });
}

/** Kategorileri Firestore'dan çek. */
export async function getCategories(): Promise<Category[]> {
  try {
    const snap = await getDocs(collection(db, 'categories'));
    return snap.docs.map(d => d.data() as Category);
  } catch (err) {
    console.warn('[Firestore] Kategoriler yüklenemedi:', err);
    return [];
  }
}

/** Seed: mock-data'daki hikaye ve kategorileri Firestore'a yaz (bir kere çalıştır). */
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
  storyId: string;
  activeChapter: number;
  unlockedChapters: number[];
  hasFullAccess: boolean;
  fateChoices: { chapterNumber: number; selectedOption: string; optionText: string; isForceChoice: boolean }[];
  generatedChapters: { chapterNumber: number; title: string; content: string; optionA: string; optionB: string }[];
}

/** Kullanıcının tüm hikaye ilerlemelerini Firestore'dan yükle */
export async function loadAllProgress(uid: string): Promise<Record<string, StoryProgress>> {
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'progress'));
    const progress: Record<string, StoryProgress> = {};
    snap.docs.forEach(d => { progress[d.id] = d.data() as StoryProgress; });
    return progress;
  } catch { return {}; }
}

/** Tek bir hikayenin ilerlemesini Firestore'a kaydet */
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

/** Kullanıcının bir karakterle olan sohbet geçmişini yükle */
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

/** Yeni bir mesajı Firestore'a kaydet */
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

export { auth, db };
