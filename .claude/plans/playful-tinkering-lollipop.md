# Plan: Yeni Onboarding Ekranı

## Context

Mevcut `onboarding-view.tsx` basit bir 3-adımlı carousel — kullanıcı tercihlerini (cinsiyet, tür, yaş) toplamıyor. Kullanıcıya özel deneyim sunmak için onboarding sırasında bu verileri toplayan, görsel olarak noir temaya uygun tek ekranlı bir karşılama deneyimi istiyoruz.

**Mevcut akış:** SplashScreen → OnboardingView → AgeGate/EULA Modal → Ana Sayfa

Yeni onboarding bu akışta **OnboardingView'in yerini alacak**, ardından mevcut AgeGate/EULA akışı devam edecek.

## Tasarım

```
┌──────────────────────────────────┐
│  Blurred noir arka plan          │
│  (çok hafif gradient + blur)     │
│                                  │
│  ✨ "Aura'nın dünyasına          │
│     adım atmadan önce..."        │
│  ─────────────────────────────── │
│  "Kendi hikayeni yaratmaya       │
│   hazır mısın?"                  │
│                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐     │
│  │ 👩   │ │ 👨   │ │ 🧑   │     │
│  │Kadın │ │Erkek │ │Diğer │     │
│  └──────┘ └──────┘ └──────┘     │
│       (seçili kart ring efekti) │
│                                  │
│  [Gizem] [Gerilim] [Romantizm]  │
│  [Fantastik] [Dram] [Macera]    │
│       (çoklu seçim pill'ler)    │
│                                  │
│  Doğum Yılı: [____]             │
│                                  │
│  ┌──────────────────────────┐   │
│  │       ONAYLA             │   │
│  └──────────────────────────┘   │
│  Onayla butonuna dokunarak...   │
└──────────────────────────────────┘
```

## Uygulama Planı

### 1. `src/components/onboarding-view.tsx` — Tamamen yeniden yaz

**Arayüz (interface):** Aynı kalacak — `{ onComplete: () => void }`

**State'ler:**
```typescript
const [gender, setGender] = useState<'female' | 'male' | 'other' | null>(null);
const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
const [birthYear, setBirthYear] = useState('');
const [error, setError] = useState<string | null>(null);
```

**Validation (onayla tıklandığında):**
- `gender !== null`
- `selectedGenres.length > 0`
- `birthYear` — mevcut yıl − yıl ≥ 18

**localStorage'a kaydedilecek:**
```json
{
  "gender": "female",
  "preferredGenres": ["Gizem", "Romantizm"],
  "birthYear": 1995
}
```
Key: `aura-onboarding-preferences`

**Bileşen yapısı:**
1. Arka plan: `fixed inset-0 z-[900]` karanlık degrade + büyük blur orb'lar
2. Scrollable içerik alanı (`overflow-y-auto`)
3. Başlık + alt başlık (font-headline, font-black)
4. Cinsiyet kartları: 3 adet `w-24 h-24` flex-row kart, `rounded-2xl`, seçili olana `ring-2 ring-primary ring-offset-2 ring-offset-background`
5. Tür pill'leri: flex-wrap, `rounded-full`, seçili `bg-primary text-white`, seçili değil `bg-muted/50`
6. Doğum yılı input: sade, koyu tema, max 4 hane, sadece rakam
7. Onayla butonu: gradient, geniş, `h-14 rounded-2xl`
8. Yasal metin: `text-[10px] text-muted-foreground text-center`

### 2. `src/app/page.tsx` — Entegrasyon (DEĞİŞİKLİK YOK)

Mevcut entegrasyon aynen korunacak:
```tsx
{showOnboarding && <OnboardingView onComplete={handleOnboardingComplete} />}
```
`handleOnboardingComplete` aynı kalacak — önce onboarding preferences'ı localStorage'a kaydeder, sonra age gate modal'ı açar. **Yeni onboarding component'i sadece kendi içinde localStorage'a yazar; page.tsx'e dokunulmaz.**

### 3. Veri akışı

```
OnboardingView (localStorage'a yazar)
  → onComplete() 
    → page.tsx: showOnboarding=false, isLoginModalOpen=true
      → AgeGate + EULA modal
        → handleAgeGateComplete()
          → localStorage: has_completed_onboarding = true
            → Ana sayfa
```

### 4. Kullanılacak pattern'ler ve utility'ler

- `cn()` — `src/lib/utils.ts`
- `glass-morphism` — `src/app/globals.css`
- `Button` — `src/components/ui/button.tsx`
- lucide-react ikonları: `User`, `Users`, `UserPlus` (cinsiyet kartları için), `Sparkles`
- Mevcut karanlık tema CSS değişkenleri (`.dark` sınıfı)

## Dosya Değişiklikleri

| Dosya | İşlem | Açıklama |
|---|---|---|
| `src/components/onboarding-view.tsx` | **Rewrite** | Tamamen yeni onboarding ekranı |
| `src/app/page.tsx` | **No change** | Entegrasyon aynı kalıyor |

## Doğrulama

1. `npm run typecheck` — TypeScript hatası yok
2. `node ./node_modules/next/dist/bin/next build` — Derleme başarılı
3. `curl http://localhost:9002/` — HTTP 200
4. Manuel test akışı: localStorage'ı temizle → sayfayı yenile → Splash → Onboarding → cinsiyet seç → tür seç → yıl gir → Onayla → AgeGate modal'ı görünmeli
