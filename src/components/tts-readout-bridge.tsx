'use client';

import { useEffect } from 'react';

/**
 * TTS oynatıcısının görsel süre alanını deterministik tutar.
 *
 * Android TextToSpeech toplam ses dosyası süresi sağlamadığı için sağ tarafta
 * sürekli değişen tahmini bir dakika göstermek yerine native progressbar'ın
 * gerçek karakter ilerlemesini yüzde olarak gösteriyoruz.
 *
 * Playback kontrolüne DOKUNMAZ; mevcut MobileNativeBridge tek playback sahibidir.
 */
export function TtsReadoutBridge() {
  useEffect(() => {
    let frame = 0;

    const syncReadout = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const progressBars = Array.from(
          document.querySelectorAll<HTMLElement>('[role="progressbar"]')
        );

        for (const progressBar of progressBars) {
          let panel: HTMLElement | null = progressBar.parentElement;
          while (panel && !panel.textContent?.includes('Sesli Okuma')) {
            panel = panel.parentElement;
          }
          if (!panel) continue;

          const raw = Number.parseFloat(progressBar.getAttribute('aria-valuenow') || '0');
          const percent = Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 0;

          // ReadingView iki küçük readout span'i oluşturuyor. Sol taraf gerçek
          // elapsed clock olarak MobileNativeBridge tarafından yönetiliyor.
          // Sağ tarafı değişken tahmini süreden gerçek progress yüzdesine çevir.
          const candidates = Array.from(panel.querySelectorAll<HTMLElement>('span')).filter((node) => {
            const text = node.textContent?.trim() || '';
            return /^~?\d{2,}:\d{2}$/.test(text) || /^\d{1,3}%$/.test(text);
          });

          const rightReadout = candidates[candidates.length - 1];
          if (rightReadout && rightReadout.textContent !== `${percent}%`) {
            rightReadout.textContent = `${percent}%`;
            rightReadout.setAttribute('aria-label', `Okuma ilerlemesi yüzde ${percent}`);
            rightReadout.style.fontVariantNumeric = 'tabular-nums';
            rightReadout.style.minWidth = '2.5rem';
            rightReadout.style.textAlign = 'right';
          }

          progressBar.setAttribute('aria-valuetext', `%${percent} tamamlandı`);
        }
      });
    };

    const observer = new MutationObserver(syncReadout);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-valuenow'],
    });

    syncReadout();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
