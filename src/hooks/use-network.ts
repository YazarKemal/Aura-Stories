'use client';

import { useState, useEffect, useCallback } from 'react';

interface NetworkState {
  online: boolean;
  /** Zayıf bağlantı (slow 2G / 3G) */
  slowConnection: boolean;
}

const INITIAL: NetworkState = {
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  slowConnection: false,
};

/**
 * Ağ durumunu izleyen hook.
 * - Çevrimdışı/çevrimiçi değişikliklerini dinler
 * - Zayıf bağlantı (slow 2G/3G) algılar
 */
export function useNetwork(): NetworkState {
  const [state, setState] = useState<NetworkState>(INITIAL);

  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, online: true }));
    const handleOffline = () => setState(prev => ({ ...prev, online: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Connection API: zayıf bağlantı algılama
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      const checkSlow = () => {
        const slow = conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.saveData;
        setState(prev => ({ ...prev, slowConnection: slow }));
      };
      checkSlow();
      conn.addEventListener('change', checkSlow);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        conn.removeEventListener('change', checkSlow);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return state;
}

/** API çağrıları için timeout sarmalayıcı */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 20000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}
