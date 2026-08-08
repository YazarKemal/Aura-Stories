'use client';

import { useEffect } from 'react';

/**
 * TTS oynatıcısının görsel katmanını deterministik tutar.
 *
 * Android TextToSpeech toplam ses dosyası süresi sağlamadığı için sağ tarafta
 * sürekli değişen tahmini bir dakika göstermek yerine native progressbar'ın
 * gerçek karakter ilerlemesini yüzde olarak gösteriyoruz.
 *
 * Ayrıca ReadingView'de çizilip herhangi bir işlevi olmayan geri/ileri atlama
 * düğmelerini gizler. Playback kontrolüne dokunmaz; MobileNativeBridge tek
 * playback sahibidir.
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
          const hasLegacyDemoClock = panel.textContent?.includes('02:15') || panel.textContent?.includes('14:30');
          const nativePercent = Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 0;
          const percent = hasLegacyDemoClock ? 0 : nativePercent;

          // ReadingView ilk mount'ta eski demo progress=35 basıyor. Native bridge
          // devralana kadar tek karelik %35 flaşı görünmesin.
          if (hasLegacyDemoClock) {
            progressBar.setAttribute('aria-valuenow', '0');
            const indicator = progressBar.firstElementChild as HTMLElement | null;
            if (indicator) indicator.style.transform = 'translateX(-100%)';
          }

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

          const leftReadout = candidates[0];
          if (leftReadout && leftReadout !== rightReadout) {
            leftReadout.style.fontVariantNumeric = 'tabular-nums';
            leftReadout.style.minWidth = '2.75rem';
          }

          progressBar.setAttribute('aria-valuetext', `%${percent} tamamlandı`);

          // SkipBack / SkipForward henüz gerçek native seek desteklemiyor.
          const playButton = Array.from(panel.querySelectorAll<HTMLButtonElement>('button'))
            .find(button => button.className.includes('w-12') && button.className.includes('h-12'));
          const controlsRow = playButton?.parentElement;
          if (playButton && controlsRow) {
            const controlButtons = Array.from(controlsRow.querySelectorAll<HTMLButtonElement>(':scope > button'));
            for (const button of controlButtons) {
              if (button !== playButton) {
                button.style.display = 'none';
                button.setAttribute('aria-hidden', 'true');
                button.tabIndex = -1;
              }
            }
            controlsRow.style.justifyContent = 'center';
            controlsRow.style.gap = '0';
          }
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
