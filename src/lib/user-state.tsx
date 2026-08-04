'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getRewardedAdUnitId, initializeAdMob, AD_REWARD_AMOUNT, isCapacitorAvailable, isSimulationForced } from '@/lib/admob-config';
import {
  auth, onAuthChange, firebaseLogin, firebaseRegister, firebaseLogout,
  getFirestoreUser, createFirestoreUser, isGiftClaimedToday,
  onUserSnapshot, loadAllProgress, saveProgress,
  type StoryProgress,
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
  storyStates: Record<string, StoryPurchaseState>;
  storyEngines: Record<string, StoryEngineState>;
  /** VIP kademe ilerlemesi — kaç reklam izlendi */
  vipAdsWatched: number;
  /** VIP kademe ilerlemesi — seçili kademe ID */
  vipSelectedTier: string;
  /** VIP bitiş zamanı (epoch ms) — null: VIP yok. Kalıcı (localStorage + Firestore) */
  vipUntil: number | null;
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
}

interface UserStateContextType {
  userState: UserState;
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
  vipAdsWatched: 0,
  vipSelectedTier: '7days',
  vipUntil: null,
  user: null,
  firebaseReady: false,
  level: 1,
  readHours: 0,
  wordsRead: 0,
  streak: 0,
  lastGiftClaimedAt: null,
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

  // ── Harcama kilidi — çift tıklamada eşzamanlı jeton düşümünü engeller
  const spendLockRef = useRef(false);

  // ── AdMob Initialize (bir kere) ────────────────────────────
  useEffect(() => {
    initializeAdMob();
  }, []);

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

  const unlockNextChapter = useCallback(
    (storyId: string, totalChapters: number): boolean => {
      const current = getCurrentChapter(storyId);
      const nextChapter = current + 1;
      if (nextChapter > totalChapters || userState.credits < CHAPTER_UNLOCK_COST) return false;

      setUserState(prev => {
        const ss = getOrCreateStoryState(prev, storyId);
        if (ss.hasFullAccess || ss.unlockedChapters.includes(nextChapter)) return prev;
        const updatedChapters = [...ss.unlockedChapters, nextChapter].sort((a, b) => a - b);
        // Firestore'a kaydet
        if (prev.user?.uid) {
          const engine = prev.storyEngines[storyId] || { fateChoices: [], generatedChapters: [], activeChapter: 1 };
          saveProgress(prev.user.uid, storyId, {
            activeChapter: engine.activeChapter,
            fateChoices: engine.fateChoices,
            generatedChapters: engine.generatedChapters.map(gc => ({
              chapterNumber: gc.chapterNumber, title: gc.title,
              content: gc.content, optionA: gc.optionA, optionB: gc.optionB,
            })),
          });
        }
        return {
          ...prev,
          credits: prev.credits - CHAPTER_UNLOCK_COST,
          storyStates: { ...prev.storyStates, [storyId]: { ...ss, unlockedChapters: updatedChapters } },
        };
      });
      return true;
    },
    [userState, getCurrentChapter]
  );

  const buyFullAccess = useCallback(
    (storyId: string): boolean => {
      const ss = getOrCreateStoryState(userState, storyId);
      if (ss.hasFullAccess) return false;
      const alreadyUnlocked = ss.unlockedChapters.length;
      const cost = Math.max(FULL_ACCESS_COST - alreadyUnlocked * CHAPTER_UNLOCK_COST, Math.floor(FULL_ACCESS_COST / 2));
      if (userState.credits < cost) return false;

      setUserState(prev => ({
        ...prev, credits: prev.credits - cost,
        storyStates: { ...prev.storyStates, [storyId]: { unlockedChapters: prev.storyStates[storyId]?.unlockedChapters || [1], hasFullAccess: true } },
      }));
      return true;
    },
    [userState]
  );

  // ── Story Engine Actions ────────────────────────────────────

  const unlockWithVote = useCallback(
    async (storyId: string): Promise<boolean> => {
      if (spendLockRef.current) return false;
      spendLockRef.current = true;
      try {
        if (userState.credits < CHAPTER_UNLOCK_COST) return false;
        // Üye kullanıcıda önce Firestore'a yaz (atomic) — hata varsa harcama iptal
        if (userState.user?.uid) {
          try {
            return false; // DEPRECATED — server-authoritative economy
          } catch (err) {
            console.warn('[UnlockWithVote] Firestore hatası:', err);
            return false;
          }
        }
        setUserState(prev => ({ ...prev, credits: prev.credits - CHAPTER_UNLOCK_COST }));
        return true;
      } finally {
        spendLockRef.current = false;
      }
    },
    [userState]
  );

  const forceFateChoice = useCallback(
    async (storyId: string, chapterNumber: number, option: 'A' | 'B', optionText: string): Promise<boolean> => {
      if (spendLockRef.current) return false;
      spendLockRef.current = true;
      try {
        if (userState.credits < FORCE_FATE_COST) return false;
        // Üye kullanıcıda önce Firestore'a yaz (atomic) — hata varsa harcama iptal
        if (userState.user?.uid) {
          try {
            return false; // DEPRECATED
          } catch (err) {
            console.warn('[ForceFate] Firestore hatası:', err);
            return false;
          }
        }

        setUserState(prev => {
          const engine = getOrCreateEngine(prev, storyId);
          const choice: FateChoice = { chapterNumber, selectedOption: option, optionText, isForceChoice: true };
          return {
            ...prev,
            credits: prev.credits - FORCE_FATE_COST,
            storyEngines: {
              ...prev.storyEngines,
              [storyId]: { ...engine, fateChoices: [...engine.fateChoices, choice], activeChapter: chapterNumber + 1 },
            },
          };
        });
        return true;
      } finally {
        spendLockRef.current = false;
      }
    },
    [userState]
  );

  const saveGeneratedChapter = useCallback(
    (storyId: string, chapter: GeneratedChapter) => {
      setUserState(prev => {
        const engine = getOrCreateEngine(prev, storyId);
        const updated = {
          ...engine,
          generatedChapters: [...engine.generatedChapters, chapter],
          activeChapter: chapter.chapterNumber,
        };
        // Firestore'a kaydet
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

  // ── Spend Credits (Firestore atomic) ─────────────────────

  const spendCredits = useCallback(async (amount: number, _operationId?: string, _detail?: string): Promise<boolean> => {
    // DEPRECATED: Artık tüm jeton işlemleri AI Functions tarafından
    // server-side transaction ile yapılır. Bu fonksiyon yalnızca
    // misafir kullanıcı local state ve Functions migration öncesi
    // geriye dönük uyumluluk için tutulur.
    // KAPALI TEST: Functions deploy edilmeden ekonomi çalışmaz.
    if (spendLockRef.current) return false;
    spendLockRef.current = true;
    try {
      const uid = userState.user?.uid;
      if (!uid) {
        if (userState.credits < amount) return false;
        setUserState(prev => ({ ...prev, credits: prev.credits - amount }));
        return true;
      }
      if (userState.credits < amount) return false;
      // FAIL CLOSED: Functions çalışmıyorsa işlem başarısız
      console.warn('[SpendCredits] DEPRECATED — ekonomi işlemleri artık AI Functions tarafından yapılır.');
      return false;
    } finally {
      spendLockRef.current = false;
    }
  }, [userState.credits, userState.user?.uid]);

  // ── Credit Sync Helper ────────────────────────────────────
  // Firestore'a jeton değişimini yazar. Admin dahil HERKES bu yolu kullanır.
  const syncCreditsToFirestore = useCallback(async (uid: string, delta: number) => {
    try {
      // noop — server-authoritative
    } catch (err) {
      console.warn('[Firestore] Kredi senkronizasyonu başarısız:', err);
    }
  }, []);

  const addCredits = useCallback((amount: number) => {
    setUserState(prev => {
      const next = prev.credits + amount;
      // Admin dahil HERKES Firestore'a yazar
      if (prev.user?.uid) syncCreditsToFirestore(prev.user.uid, amount);
      return { ...prev, credits: next };
    });
  }, [syncCreditsToFirestore]);

  // ── VIP Ad Tracking (localStorage persisted) ─────────────

  // Restore VIP progress from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aura-vip-progress');
      if (saved) {
        const { vipAdsWatched, vipSelectedTier, vipUntil } = JSON.parse(saved);
        setUserState(prev => ({
          ...prev,
          vipAdsWatched: vipAdsWatched ?? 0,
          vipSelectedTier: vipSelectedTier ?? '7days',
          vipUntil: typeof vipUntil === 'number' ? vipUntil : null,
        }));
      }
    } catch { /* ignore */ }
  }, []);

  const persistVip = (adsWatched: number, selectedTier: string, vipUntil: number | null) => {
    try {
      localStorage.setItem(
        'aura-vip-progress',
        JSON.stringify({ vipAdsWatched: adsWatched, vipSelectedTier: selectedTier, vipUntil })
      );
    } catch { /* quota exceeded */ }
  };

  const recordVipAdWatch = useCallback(() => {
    setUserState(prev => {
      const next = prev.vipAdsWatched + 1;
      persistVip(next, prev.vipSelectedTier, prev.vipUntil);
      return { ...prev, vipAdsWatched: next };
    });
  }, []);

  const setVipTier = useCallback((tierId: string) => {
    setUserState(prev => {
      persistVip(0, tierId, prev.vipUntil);
      return { ...prev, vipSelectedTier: tierId, vipAdsWatched: 0 };
    });
  }, []);

  const resetVipProgress = useCallback(() => {
    setUserState(prev => {
      persistVip(0, prev.vipSelectedTier, prev.vipUntil);
      return { ...prev, vipAdsWatched: 0 };
    });
  }, []);

  const grantVip = useCallback((durationMs: number) => {
    const until = Date.now() + durationMs;
    setUserState(prev => {
      persistVip(prev.vipAdsWatched, prev.vipSelectedTier, until);
      // Girişliyse Firestore'a da yaz — cihazlar arası senkron
      // Kapalı test: VIP devre dışı, Firestore yazılmaz
      return { ...prev, vipUntil: until };
    });
  }, []);

  const isVipActive = useCallback((): boolean => {
    return userState.vipUntil !== null && Date.now() < userState.vipUntil;
  }, [userState.vipUntil]);

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

  // ── Authentication (Firebase) ─────────────────────────────

  // Firebase auth state listener — onSnapshot ile canlı veri
  const snapshotUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsub = onAuthChange(async (fbUser) => {
      // Önceki snapshot'ı temizle
      if (snapshotUnsubRef.current) {
        snapshotUnsubRef.current();
        snapshotUnsubRef.current = null;
      }

      if (fbUser) {
        let fsUser = await getFirestoreUser(fbUser.uid);
        if (!fsUser) {
          fsUser = await createFirestoreUser(
            fbUser.uid,
            fbUser.email || '',
            fbUser.displayName || fbUser.email?.split('@')[0] || 'Okur'
          );
        }
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
          vipUntil: fsUser!.vipUntil ? new Date(fsUser!.vipUntil).getTime() : null,
          firebaseReady: true,
        }));

        // Okuma ilerlemesini Firestore'dan yükle
        loadAllProgress(fbUser.uid).then(progress => {
          setUserState(prev => {
            const engines: Record<string, any> = {};
            const states: Record<string, any> = {};
            for (const [storyId, p] of Object.entries(progress)) {
              engines[storyId] = {
                fateChoices: p.fateChoices || [],
                generatedChapters: p.generatedChapters || [],
                activeChapter: p.activeChapter || 1,
              };
              states[storyId] = {
                unlockedChapters: [1],
                hasFullAccess: false,
              };
            }
            return { ...prev, storyEngines: engines, storyStates: states };
          });
        });

        // Firestore'u gerçek zamanlı dinle
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
              // Sunucu her geldiğinde kazanır — cihazlar arası VIP senkronu
              vipUntil: updated.vipUntil ? new Date(updated.vipUntil).getTime() : null,
            }));
          }
        });
      } else {
        setUserState(prev => ({
          ...prev,
          user: null,
          credits: 200,
          firebaseReady: true,
        }));
      }
    });
    return () => {
      unsub();
      if (snapshotUnsubRef.current) snapshotUnsubRef.current();
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
      await createFirestoreUser(cred.user.uid, email, name);
      return { ok: true };
    } catch (err: any) {
      console.error('[Auth] Kayıt hatası:', err.message);
      return { ok: false, code: err?.code };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await firebaseLogout();
    } catch { /* Firebase çıkış hatası — state zaten null'a döner */ }
  }, []);

  const isLoggedIn = useCallback((): boolean => {
    return userState.user !== null;
  }, [userState.user]);

  const [isWatchingAd, setIsWatchingAd] = useState(false);

  const watchAd = useCallback(async (): Promise<number> => {
    setIsWatchingAd(true);

    // ══════════════════════════════════════════════════════════
    // 🛡️ KATI WEB KONTROLÜ (PROTOCOL TABANLI)
    // http:// veya https:// ile başlayan HER URL → tarayıcı.
    // capacitor:// ile başlayan → gerçek native uygulama.
    // Bu kontrol EN BAŞTA, hiçbir Capacitor import'u tetiklenmeden
    // önce yapılır. Donma/sonsuz yükleme riski SIFIR.
    // ══════════════════════════════════════════════════════════
    if (
      typeof window !== 'undefined' &&
      window.location.protocol.startsWith('http')
    ) {
      console.warn(
        '[AdMob] HTTP protokolü algılandı — web/tarayıcı ortamı, simülasyon başlatılıyor.'
      );
      const reward = await simulateAdReward();
      return reward;
    }

    // ── CI/E2E kilidi — Maestro cihazında gerçek SDK'yı hiç açma ──
    // (rewards-ads akışı deterministik kalır + AdMob geçersiz trafik riski yok)
    if (isSimulationForced()) {
      console.warn(
        '[AdMob] Simülasyon modu zorlandı (NEXT_PUBLIC_ADMOB_MODE=simulation).'
      );
      const reward = await simulateAdReward();
      return reward;
    }

    // ── Kapasitör Native Ortam (capacitor:// protokolü) ──────
    try {
      const isNative = await isCapacitorAvailable();

      if (!isNative) {
        console.warn(
          '[AdMob] Native platform algılanmadı, simülasyon başlatılıyor.'
        );
        const reward = await simulateAdReward();
        return reward;
      }

      /*
       * GERÇEK REWARDED AD ENTEGRASYONU (@capacitor-community/admob v8)
       *
       * Sadece fiziksel cihazda (Capacitor native runtime) çalışır.
       * API: AdMob.prepareRewardVideoAd → AdMob.showRewardVideoAd,
       * ödül/kapanış/hata olayları RewardAdPluginEvents ile dinlenir.
       */
      const { AdMob, RewardAdPluginEvents } = await import(
        '@capacitor-community/admob'
      );

      const adUnitId = getRewardedAdUnitId();

      return await new Promise<number>((resolve) => {
        // Listener'lar AdMob plugin'inde GLOBAL'dir — bitişte kaldırılmazsa
        // sonraki izlemelerde birikip çift ödül verir
        const listeners: Array<{ remove: () => Promise<void> }> = [];
        let settled = false;

        const settle = (amount: number) => {
          if (settled) return;
          settled = true;
          listeners.forEach(l => { l.remove().catch(() => {}); });
          setIsWatchingAd(false);
          resolve(amount);
        };

        const fallbackToSimulation = (reason: string) => {
          if (settled) return;
          settled = true;
          listeners.forEach(l => { l.remove().catch(() => {}); });
          console.warn(reason);
          setIsWatchingAd(false);
          simulateAdReward().then(resolve);
        };

        AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward) => {
          const amount =
            reward.amount && reward.amount > 0
              ? reward.amount
              : AD_REWARD_AMOUNT;
          setUserState(prev => {
            // Firestore'a da yaz — yalnız local kalırsa onSnapshot geri alır
            if (prev.user?.uid) syncCreditsToFirestore(prev.user.uid, amount);
            return { ...prev, credits: prev.credits + amount };
          });
          settle(amount);
        }).then(h => listeners.push(h));

        AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          // Ödül gelmeden kapatıldıysa 0; ödül geldiyse settle zaten çalıştı
          settle(0);
        }).then(h => listeners.push(h));

        AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
          fallbackToSimulation('[AdMob] Reklam yüklenemedi → simülasyon');
        }).then(h => listeners.push(h));

        AdMob.prepareRewardVideoAd({ adId: adUnitId })
          .then(() => AdMob.showRewardVideoAd())
          .catch(() => {
            fallbackToSimulation('[AdMob] Reklam gösterilemedi → simülasyon');
          });
      });
    } catch (error) {
      console.warn(
        '[AdMob] Hata, simülasyon moduna geçiliyor:',
        error instanceof Error ? error.message : String(error)
      );
      const reward = await simulateAdReward();
      return reward;
    }
  }, []);

  /**
   * Simüle reklam ödülü — Capacitor'un olmadığı geliştirme ortamlarında
   * (Termux, web tarayıcısı) gerçek reklam yerine kullanılır.
   *
   * 3-5 saniye bekler, sabit +5 jeton verir.
   */
  async function simulateAdReward(): Promise<number> {
    const delay = 3000 + Math.random() * 2000;
    await new Promise(resolve => setTimeout(resolve, delay));

    const reward = AD_REWARD_AMOUNT;
    setUserState(prev => {
      // Admin dahil Firestore'a yaz
      if (prev.user?.uid) syncCreditsToFirestore(prev.user.uid, reward);
      return { ...prev, credits: prev.credits + reward };
    });
    setIsWatchingAd(false);
    return reward;
  }

  return (
    <UserStateContext.Provider
      value={{
        userState, getCurrentChapter, isChapterAccessible,
        saveGeneratedChapter, getLatestFateOptions, getStoryEngine,
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
