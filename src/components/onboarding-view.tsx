'use client';

import { useState, useCallback } from 'react';
import { Sparkles, User, Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OnboardingViewProps {
  onComplete: () => void;
}

interface OnboardingPreferences {
  gender: string;
  genres: string[];
  birthYear: number;
  completedAt: string;
}

const GENDER_OPTIONS = [
  { value: 'kadin', label: 'Kadın', icon: User },
  { value: 'erkek', label: 'Erkek', icon: Users },
  { value: 'diger', label: 'Diğer', icon: UserPlus },
] as const;

const GENRE_OPTIONS = [
  { value: 'gizem', label: 'Gizem' },
  { value: 'gerilim', label: 'Gerilim' },
  { value: 'romantizm', label: 'Romantizm' },
  { value: 'fantastik', label: 'Fantastik' },
  { value: 'bilim-kurgu', label: 'Bilim Kurgu' },
  { value: 'dram', label: 'Dram' },
  { value: 'macera', label: 'Macera' },
] as const;

export function OnboardingView({ onComplete }: OnboardingViewProps) {
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [birthYear, setBirthYear] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGenderSelect = (value: string) => {
    setSelectedGender(prev => (prev === value ? null : value));
    setErrors(prev => ({ ...prev, gender: '' }));
  };

  const handleGenreToggle = (value: string) => {
    setSelectedGenres(prev =>
      prev.includes(value) ? prev.filter(g => g !== value) : [...prev, value]
    );
    setErrors(prev => ({ ...prev, genres: '' }));
  };

  const handleBirthYearChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    setBirthYear(cleaned);
    setErrors(prev => ({ ...prev, age: '' }));
  };

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    const currentYear = new Date().getFullYear();

    if (!selectedGender) {
      newErrors.gender = 'Lütfen bir seçenek belirleyin.';
    }
    if (selectedGenres.length === 0) {
      newErrors.genres = 'En az bir hikaye türü seçin.';
    }

    const year = parseInt(birthYear, 10);
    if (!birthYear || isNaN(year) || year < 1920 || year > currentYear) {
      newErrors.age = 'Geçerli bir doğum yılı girin.';
    } else if (currentYear - year < 18) {
      newErrors.age = '18 yaşından büyük olmalısınız.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedGender, selectedGenres, birthYear]);

  const handleConfirm = () => {
    if (!validate()) return;

    setIsSubmitting(true);

    const preferences: OnboardingPreferences = {
      gender: selectedGender!,
      genres: selectedGenres,
      birthYear: parseInt(birthYear, 10),
      completedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem('aura-onboarding-preferences', JSON.stringify(preferences));
    } catch {
      // localStorage quota exceeded — non-critical, continue
    }

    setTimeout(() => {
      onComplete();
    }, 300);
  };

  const isValid = selectedGender && selectedGenres.length > 0 && birthYear.length === 4;

  return (
    <div className="fixed inset-0 z-[900] bg-background flex flex-col items-center animate-in fade-in duration-500">
      {/* ── Noir Atmospheric Background ───────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/5 blur-[140px] rounded-full" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-accent/5 blur-[140px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/3 blur-[160px] rounded-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background/70" />
      </div>

      {/* ── Scrollable Content ────────────────────────────── */}
      <div className="relative z-10 w-full max-w-sm flex-1 overflow-y-auto no-scrollbar px-6 py-10">
        <div className="flex flex-col items-center gap-10 pb-12">

          {/* ═══════════════════════════════════════════════ */}
          {/* SECTION 1: Header Copy                          */}
          {/* ═══════════════════════════════════════════════ */}
          <div className="flex flex-col items-center gap-5 pt-4">
            <div className="w-16 h-16 rounded-[2rem] glass-morphism flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div className="flex flex-col items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-headline font-black text-accent text-center leading-tight max-w-xs">
                Aura&apos;nın dünyasına adım atmadan önce...
              </h1>
              <p className="text-sm text-muted-foreground text-center font-medium leading-relaxed">
                Kendi hikayeni yaratmaya hazır mısın?
              </p>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════ */}
          {/* SECTION 2: Gender Selection                     */}
          {/* ═══════════════════════════════════════════════ */}
          <div className="flex flex-col items-center gap-4 w-full">
            <h3 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
              Cinsiyet
            </h3>
            <div className="flex justify-center gap-4">
              {GENDER_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const isSelected = selectedGender === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleGenderSelect(opt.value)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 transition-all duration-200 active:scale-95',
                      'w-24 h-24 rounded-2xl cursor-pointer select-none',
                      isSelected
                        ? 'ring-2 ring-primary shadow-lg shadow-primary/20 scale-105 bg-primary/10 border border-primary/30'
                        : 'glass-morphism hover:scale-105 hover:bg-white/10 dark:hover:bg-white/5'
                    )}
                  >
                    <Icon className={cn('w-8 h-8 transition-colors duration-200', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('text-xs font-bold transition-colors duration-200', isSelected ? 'text-primary' : 'text-muted-foreground')}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.gender && <p className="text-xs text-destructive animate-in fade-in duration-200">{errors.gender}</p>}
          </div>

          {/* ═══════════════════════════════════════════════ */}
          {/* SECTION 3: Genre Preferences                    */}
          {/* ═══════════════════════════════════════════════ */}
          <div className="flex flex-col items-center gap-4 w-full">
            <h3 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">İlgi Alanların</h3>
            <div className="flex flex-wrap justify-center gap-2.5">
              {GENRE_OPTIONS.map(genre => {
                const isSelected = selectedGenres.includes(genre.value);
                return (
                  <button
                    key={genre.value}
                    type="button"
                    onClick={() => handleGenreToggle(genre.value)}
                    className={cn(
                      'px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 active:scale-95 select-none',
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105'
                        : 'glass-morphism text-muted-foreground hover:bg-white/10 dark:hover:bg-white/5'
                    )}
                  >
                    {genre.label}
                  </button>
                );
              })}
            </div>
            {errors.genres && <p className="text-xs text-destructive animate-in fade-in duration-200">{errors.genres}</p>}
          </div>

          {/* ═══════════════════════════════════════════════ */}
          {/* SECTION 4: Age Verification                     */}
          {/* ═══════════════════════════════════════════════ */}
          <div className="flex flex-col items-center gap-4 w-full">
            <h3 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">Doğum Yılın</h3>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="YYYY"
              value={birthYear}
              onChange={e => handleBirthYearChange(e.target.value)}
              className={cn(
                'w-40 h-14 rounded-2xl text-center text-lg font-bold',
                'bg-white/5 dark:bg-white/5 backdrop-blur-xl',
                'border border-white/10 dark:border-white/10',
                'text-accent dark:text-zinc-100 placeholder:text-muted-foreground/40',
                'outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
                'transition-all duration-200'
              )}
            />
            {errors.age && <p className="text-xs text-destructive animate-in fade-in duration-200">{errors.age}</p>}
          </div>

          {/* ═══════════════════════════════════════════════ */}
          {/* SECTION 5: Confirm + Legal                      */}
          {/* ═══════════════════════════════════════════════ */}
          <div className="flex flex-col items-center gap-4 w-full pt-2">
            <Button
              onClick={handleConfirm}
              disabled={!isValid || isSubmitting}
              className={cn(
                'w-full h-16 rounded-[2rem]',
                'bg-gradient-to-r from-primary via-accent to-primary',
                'text-white font-black text-lg',
                'shadow-xl shadow-primary/20',
                'hover:scale-[1.02] active:scale-95 transition-all',
                'disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed disabled:hover:scale-100',
                'group'
              )}
            >
              {isSubmitting ? (
                <Sparkles className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
              )}
              {isSubmitting ? 'Hazırlanıyor...' : 'Onayla'}
            </Button>
            <p className="text-[10px] text-center text-muted-foreground/70 leading-relaxed px-4 max-w-xs">
              Onayla butonuna dokunarak{' '}
              <span className="text-muted-foreground font-semibold">Kullanım Şartları</span>
              {' '}ve{' '}
              <span className="text-muted-foreground font-semibold">Gizlilik Politikası</span>
              nı kabul etmiş olursunuz.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
