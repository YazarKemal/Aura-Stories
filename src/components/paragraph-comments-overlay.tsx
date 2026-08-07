'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useUserState } from '@/lib/user-state';
import {
  loadParagraphComments,
  submitParagraphComment,
  type ParagraphComment,
  type ParagraphCommentContext,
} from '@/lib/paragraph-comments';

interface StoredStoryContext {
  storyKey: string;
  storyTitle: string;
}

function stableKey(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function readStoredStory(): StoredStoryContext {
  try {
    const raw = localStorage.getItem('aura-active-story');
    if (raw) return JSON.parse(raw) as StoredStoryContext;
  } catch { /* ignore */ }
  return { storyKey: 'aura-story', storyTitle: 'Aura Stories' };
}

function captureStoryContext(button: HTMLButtonElement) {
  if (!button.textContent?.includes('Okumaya Başla')) return;
  const detail = button.closest('div.fixed') || document.body;
  const title = detail.querySelector('h1')?.textContent?.trim() || 'Aura Stories';
  const author = Array.from(detail.querySelectorAll('p'))
    .map(node => node.textContent?.trim() || '')
    .find(value => value && value.length < 100) || '';
  const storyKey = `story-${stableKey(`${title}|${author}`)}`;
  localStorage.setItem('aura-active-story', JSON.stringify({ storyKey, storyTitle: title }));
}

function installParagraphButtons(openComments: (context: ParagraphCommentContext) => void) {
  const containers = Array.from(document.querySelectorAll<HTMLElement>('[class*="group/para"]'));
  const story = readStoredStory();

  containers.forEach((container) => {
    const paragraph = container.querySelector('p');
    const text = paragraph?.textContent?.trim();
    if (!text) return;

    // ReadingView'daki eski sadece-bazı-paragraflar yorum butonlarını kaldır.
    container.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      if (button.querySelector('.lucide-message-square') && !button.dataset.auraParagraphComment) {
        button.remove();
      }
    });

    if (container.querySelector('[data-aura-paragraph-comment="true"]')) return;

    let actions = Array.from(container.children).find((child) => {
      const el = child as HTMLElement;
      return el.tagName === 'DIV' && el.className.includes('absolute') && el.className.includes('right-');
    }) as HTMLElement | undefined;

    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'absolute -right-12 top-0 flex flex-col gap-2';
      container.appendChild(actions);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.auraParagraphComment = 'true';
    button.className = 'aura-touch-target flex items-center justify-center rounded-full text-primary/70 hover:text-primary active:scale-90 transition-all';
    button.setAttribute('aria-label', 'Paragrafa yorum yap');
    button.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path></svg>';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openComments({
        storyKey: story.storyKey,
        storyTitle: story.storyTitle,
        paragraphKey: `p-${stableKey(text)}`,
        paragraphPreview: text,
      });
    });
    actions.prepend(button);
  });
}

function formatCommentTime(date: Date | null): string {
  if (!date) return 'şimdi';
  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return 'şimdi';
  if (diffMinutes < 60) return `${diffMinutes} dk`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours} sa`;
  return `${Math.floor(hours / 24)} gün`;
}

export function ParagraphCommentsOverlay() {
  const { toast } = useToast();
  const { userState } = useUserState();
  const [context, setContext] = useState<ParagraphCommentContext | null>(null);
  const [comments, setComments] = useState<ParagraphComment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const openComments = useCallback((next: ParagraphCommentContext) => {
    setContext(next);
  }, []);

  useEffect(() => {
    const clickCapture = (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest('button') as HTMLButtonElement | null;
      if (button) captureStoryContext(button);
    };
    document.addEventListener('click', clickCapture, true);
    return () => document.removeEventListener('click', clickCapture, true);
  }, []);

  useEffect(() => {
    const run = () => installParagraphButtons(openComments);
    run();
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [openComments]);

  const refresh = useCallback(async () => {
    if (!context) return;
    setLoading(true);
    try {
      setComments(await loadParagraphComments(context));
    } catch (error) {
      console.error('[ParagraphComments] Yorumlar yüklenemedi:', error);
      toast({
        title: 'Yorumlar yüklenemedi',
        description: 'Bağlantıyı kontrol edip tekrar deneyin.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [context, toast]);

  useEffect(() => {
    if (context) void refresh();
    else {
      setComments([]);
      setText('');
    }
  }, [context, refresh]);

  const submit = async () => {
    if (!context || submitting || !text.trim()) return;
    if (!userState.user) {
      toast({
        title: 'Giriş yapmanız gerekiyor',
        description: 'Yorum göndermek için önce hesabınıza giriş yapın.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await submitParagraphComment(context, {
        uid: userState.user.uid,
        userName: userState.user.name,
        text,
      });
      setText('');
      await refresh();
      toast({ title: 'Yorum gönderildi' });
    } catch (error) {
      console.error('[ParagraphComments] Yorum gönderilemedi:', error);
      toast({
        title: 'Yorum gönderilemedi',
        description: error instanceof Error ? error.message : 'Lütfen tekrar deneyin.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={Boolean(context)} onOpenChange={(open) => { if (!open) setContext(null); }}>
      <SheetContent side="bottom" className="h-[min(680px,85dvh)] rounded-t-[2.25rem] bg-card p-0 border-none z-[900]">
        <div className="h-full flex flex-col p-6">
          <div className="w-12 h-1.5 bg-muted rounded-full self-center mb-5" />
          <SheetHeader className="text-left mb-4">
            <SheetTitle className="flex items-center gap-2 text-xl font-black">
              <MessageSquare className="w-5 h-5 text-primary" />
              Paragraf Yorumları
            </SheetTitle>
            <SheetDescription className="line-clamp-2">
              {context?.paragraphPreview}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-4">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Yorumlar yükleniyor...
              </div>
            ) : comments.length === 0 ? (
              <div className="h-full min-h-32 flex items-center justify-center text-center text-sm text-muted-foreground px-8">
                Bu paragrafta henüz yorum yok. İlk yorumu sen bırak.
              </div>
            ) : comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="w-9 h-9 ring-1 ring-primary/15">
                  <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                    {(comment.userName[0] || 'O').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-bold truncate">{comment.userName}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatCommentTime(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm leading-relaxed bg-muted/30 rounded-2xl px-4 py-3 break-words">{comment.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-border/40">
            <div className="flex items-center gap-2 rounded-2xl bg-muted/40 p-2">
              <Input
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                maxLength={800}
                placeholder={userState.user ? 'Sen ne düşünüyorsun?' : 'Yorum için giriş yapmalısın'}
                className="h-11 border-none bg-transparent focus-visible:ring-0"
              />
              <Button
                type="button"
                onClick={() => void submit()}
                disabled={submitting || !text.trim()}
                className="w-11 h-11 p-0 rounded-full shrink-0"
                aria-label="Yorumu gönder"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
