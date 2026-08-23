'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  auth, onAuthChange, firebaseLogin, firebaseRegister, firebaseLogout,
  getFirestoreUser, createFirestoreUser, isGiftClaimedToday,
  onUserSnapshot, loadAllProgress, saveProgress,
  loadAllEntitlements, onEntitlementsSnapshot, updateBlockedAuthors,
  type StoryProgress, type StoryEntitlement,
} from '@/lib/firebase';

// ── Types ────────────────────────────────────────────────────

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin';
}

export interface StoryPurchaseState {
  unlockedChapters: number[];
  hasFullAccess: boolean;
}

export interface FateChoice {
  /** The chapter this choice was made for */
  chapterNumber: number;
  /** Which option was selected: 'A' or 'B' */
  selectedOption: 'A' | 'B';
  /** The text of the chosen option */
  optionText: string;
  /** Whether this was a force-choice (50 credits, immediate) */
  isForceChoice: boolean;
}

export interface GeneratedChapter {
  chapterNumber: number;
  title: string;
  content: string;
  optionA: string;
  optionB: string;
  /** The fate choice that led to this chapter (if any) */
  triggeredBy?: FateChoice;
  generatedAt: string;
}

export interface StoryEngineState {
  /** Fate choices the user has made in this story */
  fateChoices: FateChoice[];
  /** AI-generated chapters for this story */
  generatedChapters: GeneratedChapter[];
  /** Current active chapter number in the story engine */
  activeChapter: number;
}

export interface UserState {
  credits: number;
  /** Yalnızca entitlement belgelerinden oluşturulur */
  storyStates: Record<string, StoryPurchaseState>;
  storyEngines: Record<string, StoryEngineState>;
  /** Kimlik doğrulama — null ise kullanıcı giriş yapmamış */
  user: AuthUser | null;
  /** Firebase bağlantısı hazır mı? (onAuthStateChanged ilk tetiklenme) */
  firebaseReady: boolean;
  /** Kullanıcı istatistikleri (Firestore'dan canlı) */
  level: number;
  readHours: number;
  wordsRead: number;
  streak: number;
  lastGiftClaimedAt: string | null;
  /** Engellenen yazarların display-name'leri — oturum yenileme/sonraki girişte korunur. */
  blockedAuthors: string[];
}

interface UserStateContextType {
  userState: UserState;
  /** Bir yazar (display-name) engellenmiş mi? */
  isAuthorBlocked: (author: string) => boolean;
  /** Engeli ekler/kaldırır ve Firestore'a kalıcı olarak yazar. */
  toggleBlockedAuthor: (author: string) => Promise<boolean>;
  getCurrentChapter: (storyId: string) => number;
  isChapterAccessible: (storyId: string, chapter: number) => boolean;

  // ── Story Engine ──────────────────────────────────────────
  saveGeneratedChapter: (storyId: string, chapter: GeneratedChapter) => void;
  getLatestFateOptions: (storyId: string) => { optionA: string; optionB: string } | null;
  getStoryEngine: (storyId: string) => StoryEngineState;

  // ── Authentication ──────────────────────────────────────
  login: (email: string, password: string, name?: string) => Promise<{ ok: boolean; code?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; code?: string }>;
  logout: () => void;
  isLoggedIn: () => boolean;
  /** Admin — Firebase Auth custom claims (token.admin), Firestore role ALANINA dayanmaz */
  isAdmin: boolean;

  // ── Economy — tümü server-authoritative, client amount GÖNDEREMEZ ──
  isGiftClaimedToday: boolean;
  claimDailyGift: () => Promise<boolean>;
}

// ── Pricing ──────────────────────────────────────────────────

export const CHAPTER_UNLOCK_COST = 15;
export const FORCE_FATE_COST = 50;
export const FULL_ACCESS_COST = 75;

// ── Initial State ────────────────────────────────────────────

const DEFAULT_STATE: UserState = {
  credits: 200,
  storyStates: {},
  storyEngines: {},
  user: null,
  firebaseReady: false,
  level: 1,
  readHours: 0,
  wordsRead: 0,
  streak: 0,
  lastGiftClaimedAt: null,
  blockedAuthors: [],
};

// ── Helpers ──────────────────────────────────────────────────

function getOrCreateStoryState(state: UserState, storyId: string): StoryPurchaseState {
  return state.storyStates[storyId] || { unlockedChapters: [1], hasFullAccess: false };
}

function getOrCreateEngine(state: UserState, storyId: string): StoryEngineState {
  return state.storyEngines[storyId] || { fateChoices: [], generatedChapters: [], activeChapter: 1 };
}

// ── Context ──────────────────────────────────────────────────

const UserStateContext = createContext<UserStateContextType | null>(null);

export function UserStateProvider({ children }: { children: React.ReactNode }) {
  const [userState, setUserState] = useState<UserState>(DEFAULT_STATE);

  const getCurrentChapter = useCallback(
    (storyId: string): number => {
      const ss = getOrCreateStoryState(userState, storyId);
      if (ss.hasFullAccess) return 999;
      if (ss.unlockedChapters.length === 0) return 1;
      return Math.max(...ss.unlockedChapters);
    },
    [userState]
  );

  const isChapterAccessible = useCallback(
    (storyId: string, chapter: number): boolean => {
      const ss = getOrCreateStoryState(userState, storyId);
      if (ss.hasFullAccess) return true;
      return ss.unlockedChapters.includes(chapter);
    },
    [userState]
  );

  // ── Story Engine Actions ────────────────────────────────────

  const saveGeneratedChapter = useCallback(
    (storyId: string, chapter: GeneratedChapter) => {
      setUserState(prev => {
        const engine = getOrCreateEngine(prev, storyId);
        const updated = {
          ...engine,
          generatedChapters: [...engine.generatedChapters, chapter],
          activeChapter: chapter.chapterNumber,
        };
        // Firestore'a kaydet — yalnızca progress alanları
        if (prev.user?.uid) {
          const progress: StoryProgress = {
            activeChapter: updated.activeChapter,
            fateChoices: updated.fateChoices,
            generatedChapters: updated.generatedChapters.map(gc => ({
              chapterNumber: gc.chapterNumber, title: gc.title,
              content: gc.content, optionA: gc.optionA, optionB: gc.optionB,
            })),
          };
          saveProgress(prev.user.uid, storyId, progress);
        }
        return {
          ...prev,
          storyEngines: { ...prev.storyEngines, [storyId]: updated },
        };
      });
    },
    []
  );

  const getLatestFateOptions = useCallback(
    (storyId: string): { optionA: string; optionB: string } | null => {
      const engine = getOrCreateEngine(userState, storyId);
      const chapters = engine.generatedChapters;
      if (chapters.length === 0) return null;
      const latest = chapters[chapters.length - 1];
      return { optionA: latest.optionA, optionB: latest.optionB };
    },
    [userState]
  );

  const getStoryEngine = useCallback(
    (storyId: string): StoryEngineState => getOrCreateEngine(userState, storyId),
    [userState]
  );

  // ── Daily Gift ────────────────────────────────────────────

  const isGiftClaimedTodayValue = isGiftClaimedToday(userState.lastGiftClaimedAt);

  const claimDailyGiftFn = useCallback(async (): Promise<boolean> => {
    const uid = userState.user?.uid;
    if (!uid) return false;
    if (isGiftClaimedToday(userState.lastGiftClaimedAt)) return false;

    try {
      const { callClaimDailyGift } = await import('@/lib/functions-client');
      const opId = `gift_${uid}_${Date.now()}`;
      const result = await callClaimDailyGift(opId);
      setUserState(prev => ({
        ...prev,
        credits: result.balanceAfter,
        lastGiftClaimedAt: new Date().toISOString(),
      }));
      return true;
    } catch (err: any) {
      if (err?.message?.includes('aldınız')) return false;
      console.warn('[DailyGift] Functions hatası:', err);
      return false; // FAIL CLOSED — fallback yok
    }
  }, [userState.user?.uid, userState.lastGiftClaimedAt]);

  // ── Author Blocking ─────────────────────────────────────

  const isAuthorBlocked = useCallback(
    (author: string) => userState.blockedAuthors.includes(author),
    [userState.blockedAuthors]
  );

  const toggleBlockedAuthor = useCallback(async (author: string): Promise<boolean> => {
    const uid = userState.user?.uid;
    if (!uid || !author) return false;
    const current = userState.blockedAuthors;
    const next = current.includes(author)
      ? current.filter(a => a !== author)
      : [...current, author];
    // İyimser güncelleme — UI anında tepki verir
    setUserState(prev => ({ ...prev, blockedAuthors: next }));
    try {
      await updateBlockedAuthors(uid, next);
      return true;
    } catch {
      // Hata → önceki duruma geri dön
      setUserState(prev => ({ ...prev, blockedAuthors: current }));
      return false;
    }
  }, [userState.user?.uid, userState.blockedAuthors]);

  // ── Authentication (Firebase) ─────────────────────────────

  // Firebase auth state listener — onSnapshot ile canlı veri
  const snapshotUnsubRef = useRef<(() => void) | null>(null);
  const entitlementsUnsubRef = useRef<(() => void) | null>(null);

  // Tek yazıcılı profil bootstrap: register() ve onAuthChange her ikisi de
  // eksik profil görünce createFirestoreUser çağırıyordu — aynı uid için
  // eşzamanlı çift setDoc yarışı olabilir. Bu harita uid başına tek uçuş
  // (single-flight) garantisi verir; her iki yazar da aynı promise'i paylaşır.
  const profileBootstrapRef = useRef(new Map<string, ReturnType<typeof createFirestoreUser>>());

  const ensureUserProfile = useCallback(
    async (uid: string, email: string, name: string) => {
      const existing = await getFirestoreUser(uid);
      if (existing) return existing;
      const inflight = profileBootstrapRef.current.get(uid);
      if (inflight) return inflight;
      const write = createFirestoreUser(uid, email, name);
      profileBootstrapRef.current.set(uid, write);
      void write.finally(() => {
        if (profileBootstrapRef.current.get(uid) === write) {
          profileBootstrapRef.current.delete(uid);
        }
      });
      return write;
    },
    []
  );

  useEffect(() => {
    const unsub = onAuthChange(async (fbUser) => {
      // Önceki snapshot'ları temizle
      if (snapshotUnsubRef.current) {
        snapshotUnsubRef.current();
        snapshotUnsubRef.current = null;
      }
      if (entitlementsUnsubRef.current) {
        entitlementsUnsubRef.current();
        entitlementsUnsubRef.current = null;
      }

      if (fbUser) {
        const fsUser = await ensureUserProfile(
          fbUser.uid,
          fbUser.email || '',
          fbUser.displayName || fbUser.email?.split('@')[0] || 'Okur'
        );
        const authUser: AuthUser = {
          uid: fsUser.uid,
          name: fsUser.name,
          email: fsUser.email,
          role: fsUser.role,
        };
        setUserState(prev => ({
          ...prev,
          user: authUser,
          credits: fsUser!.credits,
          level: fsUser!.level ?? 1,
          readHours: fsUser!.readHours ?? 0,
          wordsRead: fsUser!.wordsRead ?? 0,
          streak: fsUser!.streak ?? 0,
          lastGiftClaimedAt: fsUser!.lastGiftClaimedAt ?? null,
          blockedAuthors: fsUser!.blockedAuthors ?? [],
          firebaseReady: true,
        }));

        // Okuma ilerlemesini Firestore'dan yükle (progress koleksiyonu)
        loadAllProgress(fbUser.uid).then(progress => {
          setUserState(prev => {
            const engines: Record<string, any> = {};
            for (const [storyId, p] of Object.entries(progress)) {
              engines[storyId] = {
                fateChoices: p.fateChoices || [],
                generatedChapters: p.generatedChapters || [],
                activeChapter: p.activeChapter || 1,
              };
            }
            return { ...prev, storyEngines: engines };
          });
        });

        // Entitlement'ları yükle ve gerçek zamanlı dinle
        loadAllEntitlements(fbUser.uid).then(entitlements => {
          setUserState(prev => {
            const states: Record<string, StoryPurchaseState> = {};
            for (const [storyId, ent] of Object.entries(entitlements)) {
              states[storyId] = {
                unlockedChapters: ent.unlockedChapters || [1],
                hasFullAccess: ent.hasFullAccess || false,
              };
            }
            return { ...prev, storyStates: states };
          });
        });

        // Entitlement'ları gerçek zamanlı dinle — Functions yazınca UI otomatik güncellenir
        entitlementsUnsubRef.current = onEntitlementsSnapshot(fbUser.uid, (entitlements) => {
          setUserState(prev => {
            const states: Record<string, StoryPurchaseState> = {};
            for (const [storyId, ent] of Object.entries(entitlements)) {
              states[storyId] = {
                unlockedChapters: ent.unlockedChapters || [1],
                hasFullAccess: ent.hasFullAccess || false,
              };
            }
            return { ...prev, storyStates: states };
          });
        });

        // Firestore'u gerçek zamanlı dinle (credits, stats)
        snapshotUnsubRef.current = onUserSnapshot(fbUser.uid, (updated) => {
          if (updated) {
            setUserState(prev => ({
              ...prev,
              credits: updated.credits,
              level: updated.level ?? 1,
              readHours: updated.readHours ?? 0,
              wordsRead: updated.wordsRead ?? 0,
              streak: updated.streak ?? 0,
              lastGiftClaimedAt: updated.lastGiftClaimedAt ?? null,
              blockedAuthors: updated.blockedAuthors ?? [],
            }));
          }
        });
      } else {
        // Logout — tüm state temizlensin
        setUserState(prev => ({
          ...prev,
          user: null,
          credits: 200,
          storyStates: {},
          storyEngines: {},
          blockedAuthors: [],
          firebaseReady: true,
        }));
      }
    });
    return () => {
      unsub();
      if (snapshotUnsubRef.current) snapshotUnsubRef.current();
      if (entitlementsUnsubRef.current) entitlementsUnsubRef.current();
    };
  }, []);

  // Admin rolü — Firebase Auth custom claims (token.admin).
  // Firestore user.role alanı admin yetkisinin KAYNAĞI DEĞİLDİR.
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const checkAdmin = async () => {
      if (!auth.currentUser) { setIsAdmin(false); return; }
      try {
        const token = await auth.currentUser.getIdTokenResult();
        setIsAdmin(token.claims.admin === true);
      } catch { setIsAdmin(false); }
    };
    checkAdmin();
  }, [userState.user?.uid]);

  const login = useCallback(async (email: string, password: string, _name?: string): Promise<{ ok: boolean; code?: string }> => {
    try {
      await firebaseLogin(email, password);
      return { ok: true };
    } catch (err: any) {
      console.error('[Auth] Giriş hatası:', err.message);
      return { ok: false, code: err?.code };
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string): Promise<{ ok: boolean; code?: string }> => {
    try {
      const cred = await firebaseRegister(email, password);
      await ensureUserProfile(cred.user.uid, email, name);
      return { ok: true };
    } catch (err: any) {
      console.error('[Auth] Kayıt hatası:', err.message);
      return { ok: false, code: err?.code };
    }
  }, [ensureUserProfile]);

  const logout = useCallback(async () => {
    try {
      await firebaseLogout();
    } catch { /* Firebase çıkış hatası — state zaten null'a döner */ }
  }, []);

  const isLoggedIn = useCallback((): boolean => {
    return userState.user !== null;
  }, [userState.user]);

  return (
    <UserStateContext.Provider
      value={{
        userState, getCurrentChapter, isChapterAccessible,
        saveGeneratedChapter, getLatestFateOptions, getStoryEngine,
        isAuthorBlocked, toggleBlockedAuthor,
        login, register, logout, isLoggedIn, isAdmin,
        isGiftClaimedToday: isGiftClaimedTodayValue,
        claimDailyGift: claimDailyGiftFn,
      }}
    >
      {children}
    </UserStateContext.Provider>
  );
}

export function useUserState(): UserStateContextType {
  const ctx = useContext(UserStateContext);
  if (!ctx) throw new Error('useUserState must be used within UserStateProvider');
  return ctx;
}
