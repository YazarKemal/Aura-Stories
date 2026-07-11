'use client';

import { useState, useCallback } from 'react';
import { Sparkles, User, Users, UserPlus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OnboardingViewProps {
  onComplete: () => void;
}

interface OnboardingPreferences {
  gender: string;
  genres: string[];
  birthYear: number;
  language: string;
  microTopics: string[];
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

const LANGUAGE_OPTIONS = [
  { value: 'tr', label: 'Türkçe' },
  { value: 'en', label: 'English' },
] as const;

const MICRO_TOPICS = [
  { value: 'patron', label: 'Patron', icon: '💼' },
  { value: 'gizemli-cinayet', label: 'Gizemli Cinayet', icon: '🕵️' },
  { value: 'vampir', label: 'Vampir', icon: '🧛‍♂️' },
  { value: 'yasak-ask', label: 'Yasak Aşk', icon: '💔' },
  { value: 'intikam', label: 'İntikam', icon: '⚔️' },
  { value: 'buyu-akademisi', label: 'Büyü Akademisi', icon: '🔮' },
  { value: 'paralel-evren', label: 'Paralel Evren', icon: '🌌' },
  { value: 'taht-kavgasi', label: 'Taht Kavgası', icon: '👑' },
  { value: 'kimlik-sirri', label: 'Kimlik Sırrı', icon: '🎭' },
  { value: 'lanetli-miras', label: 'Lanetli Miras', icon: '🌙' },
  { value: 'kurt-adam', label: 'Kurt Adam', icon: '🐺' },
  { value: 'olum-oyunu', label: 'Ölüm Oyunu', icon: '💀' },
] as const;

export function OnboardingView({ onComplete }: OnboardingViewProps) {
  const [step, setStep] = useState(1);

  // ── Step 1 state ─────────────────────────────────────
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [birthYear, setBirthYear] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Step 2 state ─────────────────────────────────────
  const [language, setLanguage] = useState('tr');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  // ── Step 1 handlers ──────────────────────────────────
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

  // ── Step 2 handlers ──────────────────────────────────
  const handleTopicToggle = (value: string) => {
    setSelectedTopics(prev =>
      prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]
    );
  };

  // ── Validation ───────────────────────────────────────
  const validateStep1 = useCallback((): boolean => {
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

  // ── Navigation ───────────────────────────────────────
  const handleStep1Next = () => {
    if (!validateStep1()) return;
    setStep(2);
  };

  const handleFinalSubmit = () => {
    const preferences: OnboardingPreferences = {
      gender: selectedGender!,
      genres: selectedGenres,
      birthYear: parseInt(birthYear, 10),
      language,
      microTopics: selectedTopics,
      completedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem('aura-onboarding-preferences', JSON.stringify(preferences));
    } catch {
      // localStorage quota exceeded — non-critical, continue
    }

    onComplete();
  };

  const handleSkip = () => {
    onComplete();
  };

  // ── Derived ──────────────────────────────────────────
  const isStep1Valid = selectedGender && selectedGenres.length > 0 && birthYear.length === 4;

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

        {/* ═══════════════════════════════════════════════════ */}
        {/* STEP 1: Age, Gender, Genres                        */}
        {/* ═══════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-10 pb-12 animate-in fade-in duration-300">

            {/* Header Copy */}
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

            {/* Gender Selection */}
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

            {/* Genre Preferences */}
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

            {/* Age Verification */}
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

            {/* Step 1 → Step 2 Button */}
            <div className="flex flex-col items-center gap-4 w-full pt-2">
              <Button
                onClick={handleStep1Next}
                disabled={!isStep1Valid}
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
                <Sparkles className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                Devam
              </Button>
              <p className="text-[10px] text-center text-muted-foreground/70 leading-relaxed px-4 max-w-xs">
                Devam butonuna dokunarak{' '}
                <span className="text-muted-foreground font-semibold">Kullanım Şartları</span>
                {' '}ve{' '}
                <span className="text-muted-foreground font-semibold">Gizlilik Politikası</span>
                nı kabul etmiş olursunuz.
              </p>
            </div>

          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* STEP 2: Language + Micro-Topics + Final Submit     */}
        {/* ═══════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="relative flex flex-col items-center gap-8 pb-12 animate-in fade-in duration-300">

            {/* ── Skip Button (absolute top-right) ─────────── */}
            <button
              type="button"
              onClick={handleSkip}
              className="absolute top-0 right-0 text-[10px] tracking-[0.2em] text-muted-foreground/50 hover:text-muted-foreground/80 font-medium transition-colors duration-200"
            >
              ATLA
            </button>

            {/* ── Header ───────────────────────────────────── */}
            <div className="flex flex-col items-center gap-2 pt-8">
              <h2 className="text-2xl sm:text-3xl font-headline font-black text-accent text-center leading-tight">
                Bizde Olanlar
              </h2>
              <p className="text-sm text-muted-foreground text-center font-medium leading-relaxed">
                Okumak istedikleriniz
              </p>
            </div>

            {/* ── Language Select ──────────────────────────── */}
            <div className="flex flex-col items-center gap-3 w-full">
              <h3 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
                Hikaye Dili
              </h3>
              <div className="relative w-full max-w-[200px]">
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className={cn(
                    'w-full h-12 rounded-2xl px-4 pr-10 text-sm font-bold',
                    'bg-white/5 dark:bg-white/5 backdrop-blur-xl',
                    'border border-white/10 dark:border-white/10',
                    'text-accent dark:text-zinc-100',
                    'outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
                    'transition-all duration-200 appearance-none cursor-pointer'
                  )}
                >
                  {LANGUAGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-background text-foreground">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* ── Micro-Topic Pills ────────────────────────── */}
            <div className="flex flex-col items-center gap-4 w-full">
              <h3 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
                Beğendiğiniz Konuları Seçin
              </h3>
              <div className="flex flex-wrap justify-center gap-2.5">
                {MICRO_TOPICS.map(topic => {
                  const isSelected = selectedTopics.includes(topic.value);
                  return (
                    <button
                      key={topic.value}
                      type="button"
                      onClick={() => handleTopicToggle(topic.value)}
                      className={cn(
                        'px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-200 active:scale-95 select-none',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105'
                          : 'glass-morphism text-muted-foreground hover:bg-white/10 dark:hover:bg-white/5'
                      )}
                    >
                      <span className="mr-1.5">{topic.icon}</span>
                      {topic.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Final Submit Button ──────────────────────── */}
            <div className="flex flex-col items-center gap-3 w-full pt-2">
              <Button
                onClick={handleFinalSubmit}
                className={cn(
                  'w-full h-16 rounded-[2rem]',
                  'bg-gradient-to-r from-primary via-accent to-primary',
                  'text-white font-black text-lg',
                  'shadow-xl shadow-primary/20',
                  'hover:scale-[1.02] active:scale-95 transition-all',
                  'group'
                )}
              >
                <Sparkles className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                Okumaya Başlayın
              </Button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
