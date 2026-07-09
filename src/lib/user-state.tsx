'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getRewardedAdUnitId, initializeAdMob, AD_REWARD_AMOUNT, isCapacitorAvailable } from '@/lib/admob-config';
import {
  onAuthChange,
  firebaseLogin,
  firebaseRegister,
  firebaseLogout,
  getFirestoreUser,
  createFirestoreUser,
  updateFirestoreCredits,
  claimDailyGift as firestoreClaimDailyGift,
  isGiftClaimedToday,
  onUserSnapshot,
  loadAllProgress,
  saveProgress,
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
  unlockNextChapter: (storyId: string, totalChapters: number) => boolean;
  buyFullAccess: (storyId: string) => boolean;
  getCurrentChapter: (storyId: string) => number;
  isChapterAccessible: (storyId: string, chapter: number) => boolean;
  addCredits: (amount: number) => void;

  // ── Story Engine ──────────────────────────────────────────
  /** Spend 15 credits to unlock the next chapter via community vote */
  unlockWithVote: (storyId: string) => boolean;
  /** Spend 50 credits to force a specific fate choice immediately */
  forceFateChoice: (storyId: string, chapterNumber: number, option: 'A' | 'B', optionText: string) => boolean;
  /** Save an AI-generated chapter to the story engine */
  saveGeneratedChapter: (storyId: string, chapter: GeneratedChapter) => void;
  /** Get the latest fate options for a story */
  getLatestFateOptions: (storyId: string) => { optionA: string; optionB: string } | null;
  /** Get the engine state for a story */
  getStoryEngine: (storyId: string) => StoryEngineState;

  // ── Authentication ──────────────────────────────────────
  /** Giriş yap (Firebase). Kullanıcıyı state ve Firestore'a kaydeder */
  login: (email: string, password: string, name?: string) => Promise<boolean>;
  /** Kayıt ol (Firebase). Yeni kullanıcı oluşturur */
  register: (name: string, email: string, password: string) => Promise<boolean>;
  /** Çıkış yap. State ve Firebase oturumunu temizler */
  logout: () => void;
  /** Kullanıcı giriş yapmış mı? */
  isLoggedIn: () => boolean;
  /** Admin rolü — sadece UI ayrıcalıkları için. Jeton bypass'ı YOKTUR. */
  isAdmin: boolean;
  /** Jeton harca (Firestore atomic). Bakiye yetersizse false döner. */
  spendCredits: (amount: number) => Promise<boolean>;
  /** Günlük hediye — bugün alınmış mı? */
  isGiftClaimedToday: boolean;
  /** Günlük hediyeyi al (Firestore'a yazar + 50 jeton) */
  claimDailyGift: () => Promise<boolean>;

  // ── VIP Ad Tracking ──────────────────────────────────────
  /** Reklam izlendiğinde VIP kademe sayacını artır. Kalıcıdır (localStorage). */
  recordVipAdWatch: () => void;
  /** VIP kademesini değiştir ve sayacı sıfırla */
  setVipTier: (tierId: string) => void;
  /** VIP ilerlemesini sıfırla (kademe tamamlandığında) */
  resetVipProgress: () => void;

  // ── Rewarded Ads ──────────────────────────────────────────
  /** Simulate watching a rewarded ad. Returns the amount of credits earned. */
  watchAd: () => Promise<number>;
  /** Whether an ad is currently being "watched" */
  isWatchingAd: boolean;
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
            storyId, activeChapter: engine.activeChapter,
            unlockedChapters: updatedChapters, hasFullAccess: ss.hasFullAccess,
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
    (storyId: string): boolean => {
      if (userState.credits < CHAPTER_UNLOCK_COST) return false;
      setUserState(prev => ({ ...prev, credits: prev.credits - CHAPTER_UNLOCK_COST }));
      return true;
    },
    [userState]
  );

  const forceFateChoice = useCallback(
    (storyId: string, chapterNumber: number, option: 'A' | 'B', optionText: string): boolean => {
      if (userState.credits < FORCE_FATE_COST) return false;

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
            storyId,
            activeChapter: updated.activeChapter,
            unlockedChapters: prev.storyStates[storyId]?.unlockedChapters || [1],
            hasFullAccess: prev.storyStates[storyId]?.hasFullAccess || false,
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

  const spendCredits = useCallback(async (amount: number): Promise<boolean> => {
    const uid = userState.user?.uid;
    if (!uid) {
      // Misafir kullanıcı — local state'ten düş
      if (userState.credits < amount) return false;
      setUserState(prev => ({ ...prev, credits: prev.credits - amount }));
      return true;
    }
    // Bakiye kontrolü
    if (userState.credits < amount) return false;
    // Firestore'dan düş
    try {
      await updateFirestoreCredits(uid, -amount);
      setUserState(prev => ({ ...prev, credits: prev.credits - amount }));
      return true;
    } catch (err) {
      console.warn('[SpendCredits] Firestore hatası:', err);
      return false;
    }
  }, [userState.credits, userState.user?.uid]);

  // ── Credit Sync Helper ────────────────────────────────────
  // Firestore'a jeton değişimini yazar. Admin dahil HERKES bu yolu kullanır.
  const syncCreditsToFirestore = useCallback(async (uid: string, delta: number) => {
    try {
      await updateFirestoreCredits(uid, delta);
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
        const { vipAdsWatched, vipSelectedTier } = JSON.parse(saved);
        setUserState(prev => ({
          ...prev,
          vipAdsWatched: vipAdsWatched ?? 0,
          vipSelectedTier: vipSelectedTier ?? '7days',
        }));
      }
    } catch { /* ignore */ }
  }, []);

  const persistVip = (adsWatched: number, selectedTier: string) => {
    try {
      localStorage.setItem(
        'aura-vip-progress',
        JSON.stringify({ vipAdsWatched: adsWatched, vipSelectedTier: selectedTier })
      );
    } catch { /* quota exceeded */ }
  };

  const recordVipAdWatch = useCallback(() => {
    setUserState(prev => {
      const next = prev.vipAdsWatched + 1;
      persistVip(next, prev.vipSelectedTier);
      return { ...prev, vipAdsWatched: next };
    });
  }, []);

  const setVipTier = useCallback((tierId: string) => {
    setUserState(prev => {
      persistVip(0, tierId);
      return { ...prev, vipSelectedTier: tierId, vipAdsWatched: 0 };
    });
  }, []);

  const resetVipProgress = useCallback(() => {
    setUserState(prev => {
      persistVip(0, prev.vipSelectedTier);
      return { ...prev, vipAdsWatched: 0 };
    });
  }, []);

  // ── Daily Gift ────────────────────────────────────────────

  const isGiftClaimedTodayValue = isGiftClaimedToday(userState.lastGiftClaimedAt);

  const claimDailyGiftFn = useCallback(async (): Promise<boolean> => {
    const uid = userState.user?.uid;
    if (!uid) return false;
    if (isGiftClaimedToday(userState.lastGiftClaimedAt)) return false;

    try {
      await firestoreClaimDailyGift(uid);
      setUserState(prev => ({
        ...prev,
        credits: prev.credits + 50,
        lastGiftClaimedAt: new Date().toISOString(),
      }));
      return true;
    } catch (err) {
      console.warn('[DailyGift] Firestore hatası:', err);
      return false;
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
                unlockedChapters: p.unlockedChapters || [1],
                hasFullAccess: p.hasFullAccess || false,
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

  // Admin rolü kontrolü — sadece UI ayrıcalıkları için.
  // KESİNLİKLE jeton bypass'ı YOKTUR.
  const isAdmin = userState.user?.role === 'admin';

  const login = useCallback(async (email: string, password: string, _name?: string): Promise<boolean> => {
    try {
      await firebaseLogin(email, password);
      return true;
    } catch (err: any) {
      console.error('[Auth] Giriş hatası:', err.message);
      return false;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const cred = await firebaseRegister(email, password);
      await createFirestoreUser(cred.user.uid, email, name);
      return true;
    } catch (err: any) {
      console.error('[Auth] Kayıt hatası:', err.message);
      return false;
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
      console.log(
        '[AdMob] HTTP protokolü algılandı — web/tarayıcı ortamı, simülasyon başlatılıyor.'
      );
      const reward = await simulateAdReward();
      return reward;
    }

    // ── Kapasitör Native Ortam (capacitor:// protokolü) ──────
    try {
      const isNative = await isCapacitorAvailable();

      if (!isNative) {
        console.log(
          '[AdMob] Native platform algılanmadı, simülasyon başlatılıyor.'
        );
        const reward = await simulateAdReward();
        return reward;
      }

      /*
       * GERÇEK REWARDED AD ENTEGRASYONU
       *
       * Sadece fiziksel cihazda (Capacitor native runtime) çalışır.
       * Paketleri yüklemek için:
       *   npm install @capacitor-community/admob
       *   npx cap sync
       */
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { RewardedAd } = await import('@capacitor-community/admob');

      const adUnitId = getRewardedAdUnitId();

      return new Promise<number>((resolve) => {
        const ad = new RewardedAd({ adId: adUnitId });

        ad.addListener('onRewarded', (reward: { amount?: number }) => {
          const amount =
            reward.amount && reward.amount > 0
              ? reward.amount
              : AD_REWARD_AMOUNT;
          setUserState(prev => ({ ...prev, credits: prev.credits + amount }));
          setIsWatchingAd(false);
          resolve(amount);
        });

        ad.addListener('onFailedToLoad', () => {
          console.warn('[AdMob] Reklam yüklenemedi → simülasyon');
          setIsWatchingAd(false);
          simulateAdReward().then(resolve);
        });

        ad.addListener('onDismissed', () => {
          setIsWatchingAd(false);
          resolve(0);
        });

        ad.load().then(() => ad.show()).catch(() => {
          console.warn('[AdMob] Reklam gösterilemedi → simülasyon');
          setIsWatchingAd(false);
          simulateAdReward().then(resolve);
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
        userState, unlockNextChapter, buyFullAccess, getCurrentChapter, isChapterAccessible, addCredits,
        unlockWithVote, forceFateChoice, saveGeneratedChapter, getLatestFateOptions, getStoryEngine,
        recordVipAdWatch, setVipTier, resetVipProgress,
        login, register, logout, isLoggedIn, isAdmin,
        spendCredits,
        isGiftClaimedToday: isGiftClaimedTodayValue,
        claimDailyGift: claimDailyGiftFn,
        watchAd, isWatchingAd,
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
