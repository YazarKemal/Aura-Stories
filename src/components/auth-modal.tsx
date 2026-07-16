'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useUserState } from '@/lib/user-state';
import { firebaseGoogleLogin } from '@/lib/firebase';
import { Mail, Lock, User, LogIn, UserPlus, Sparkles, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthTab = 'login' | 'register';

/** Auth işlemi bu süre içinde bitmezse zaman aşımı sayılır */
const AUTH_TIMEOUT_MS = 15000;

/** Firebase hata kodlarını kullanıcıya gösterilecek Türkçe mesajlara çevirir */
function mapFirebaseError(code: string | undefined, tab: AuthTab): string {
  const map: Record<string, string> = {
    'auth/invalid-credential': 'E-posta veya şifre hatalı.',
    'auth/user-not-found': 'Bu e-posta ile kayıtlı kullanıcı bulunamadı.',
    'auth/wrong-password': 'Şifre hatalı.',
    'auth/email-already-in-use': 'Bu e-posta adresi zaten kayıtlı.',
    'auth/too-many-requests': 'Çok fazla hatalı deneme. Lütfen bir süre bekleyin.',
    'auth/network-request-failed': 'Ağ bağlantısı hatası. İnternetinizi kontrol edin.',
    'auth/invalid-email': 'Geçersiz e-posta adresi.',
    'auth/weak-password': 'Şifre çok zayıf. Daha güçlü bir şifre deneyin.',
  };
  if (code && map[code]) return map[code];
  return tab === 'login' ? 'Giriş başarısız. E-posta veya şifre hatalı.' : 'Kayıt başarısız. Lütfen tekrar deneyin.';
}

/** Promise'i zaman aşımıyla yarıştırır — ağ takılırsa sonsuz bekleme olmaz */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms)),
  ]);
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, register } = useUserState();
  const [tab, setTab] = useState<AuthTab>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleTabSwitch = (t: AuthTab) => {
    setTab(t);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }
    if (password.length < 4) {
      setError('Şifre en az 4 karakter olmalıdır.');
      return;
    }
    if (tab === 'register' && !name.trim()) {
      setError('Lütfen adınızı girin.');
      return;
    }

    // Offline kontrolü — ağ yokken Firebase'i hiç bekletme
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('İnternet bağlantınız yok. Lütfen bağlantınızı kontrol edin.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await withTimeout(
        tab === 'register'
          ? register(name.trim(), email.trim(), password)
          : login(email.trim(), password),
        AUTH_TIMEOUT_MS
      );

      if (!result.ok) {
        setError(mapFirebaseError(result.code, tab));
        return;
      }

      resetForm();
      onClose();
    } catch (err: any) {
      setError(err?.message === 'TIMEOUT'
        ? 'İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.'
        : 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-[90%] rounded-[2.5rem] p-0 border-none bg-background/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <DialogTitle className="sr-only">{tab === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</DialogTitle>

        {/* Header with tabs */}
        <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 dark:from-zinc-800 dark:to-zinc-900 p-8 pb-4">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
              <Sparkles className="w-8 h-8" />
            </div>

            {/* Tabs */}
            <div className="flex bg-muted/50 dark:bg-zinc-800 rounded-2xl p-1 w-full max-w-[240px]">
              <button
                onClick={() => handleTabSwitch('login')}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                  tab === 'login'
                    ? "bg-white dark:bg-zinc-700 text-accent dark:text-zinc-100 shadow-sm"
                    : "text-muted-foreground hover:text-accent"
                )}
              >
                <LogIn className="w-4 h-4" />
                Giriş
              </button>
              <button
                onClick={() => handleTabSwitch('register')}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                  tab === 'register'
                    ? "bg-white dark:bg-zinc-700 text-accent dark:text-zinc-100 shadow-sm"
                    : "text-muted-foreground hover:text-accent"
                )}
              >
                <UserPlus className="w-4 h-4" />
                Kayıt
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 pt-4 flex flex-col gap-4">
          {tab === 'register' && (
            <div className="space-y-1.5">
              <Label htmlFor="auth-name" className="text-xs font-bold text-muted-foreground">Ad Soyad</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="auth-name"
                  type="text"
                  placeholder="Adınızı girin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 pl-11 rounded-2xl border-border/50 dark:border-zinc-700 bg-muted/30 dark:bg-zinc-800"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="auth-email" className="text-xs font-bold text-muted-foreground">E-posta</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="auth-email"
                type="email"
                placeholder="eposta@ornek.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 pl-11 rounded-2xl border-border/50 dark:border-zinc-700 bg-muted/30 dark:bg-zinc-800"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="auth-password" className="text-xs font-bold text-muted-foreground">Şifre</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 pl-11 rounded-2xl border-border/50 dark:border-zinc-700 bg-muted/30 dark:bg-zinc-800"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-bold text-destructive text-center bg-destructive/5 py-2 rounded-xl">{error}</p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-accent dark:from-purple-600 dark:to-indigo-600 text-white font-black shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-70"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                İşleniyor...
              </span>
            ) : (
              tab === 'login' ? 'Giriş Yap' : 'Kayıt Ol'
            )}
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border/30" />
            <span className="text-[10px] text-muted-foreground font-bold uppercase">veya</span>
            <div className="flex-1 h-px bg-border/30" />
          </div>

          {/* Social login placeholders */}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={async (e) => {
                e.preventDefault();
                if (isSubmitting) return;
                setError('');
                if (typeof navigator !== 'undefined' && !navigator.onLine) {
                  setError('İnternet bağlantınız yok. Lütfen bağlantınızı kontrol edin.');
                  return;
                }
                setIsSubmitting(true);
                try {
                  await withTimeout(firebaseGoogleLogin(), AUTH_TIMEOUT_MS);
                  resetForm();
                  onClose();
                } catch (err: any) {
                  if (err?.message === 'TIMEOUT') {
                    setError('İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.');
                  } else if (err?.code === 'auth/network-request-failed') {
                    setError('Ağ bağlantısı hatası. İnternetinizi kontrol edin.');
                  } else if (err?.code !== 'auth/popup-closed-by-user') {
                    setError('Google ile giriş başarısız. Lütfen tekrar deneyin.');
                  }
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="w-full h-12 rounded-2xl border-border/50 dark:border-zinc-700 font-bold text-sm gap-3 hover:bg-muted/30"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google ile Giriş Yap
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled
              className="w-full h-12 rounded-2xl border-border/50 dark:border-zinc-700 font-bold text-sm gap-3 opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              Apple ile Giriş Yap (Yakında)
            </Button>
          </div>

          <p className="text-[10px] text-center text-muted-foreground">
            Giriş yaparak Kullanıcı Sözleşmesi&apos;ni kabul etmiş olursunuz.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
