'use client';

import { useState, useEffect } from 'react';
import { DiscoverScreen } from '@/components/discover-screen';
import { BottomNav } from '@/components/bottom-nav';
import { Header } from '@/components/header';
import { BookDetailView } from '@/components/book-detail-view';
import { ReadingView } from '@/components/reading-view';
import { RewardsScreen } from '@/components/rewards-screen';
import { ProfileScreen } from '@/components/profile-screen';
import { LibraryScreen } from '@/components/library-screen';
import { WriterDashboard } from '@/components/writer-dashboard';
import { CharacterChatView } from '@/components/character-chat-view';
import { CharacterRoom } from '@/components/character-room';
import { SearchView } from '@/components/search-view';
import { VIPScreen } from '@/components/vip-screen';
import { Story } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sparkles, ScrollText } from 'lucide-react';
import { SplashScreen } from '@/components/splash-screen';
import { OnboardingView } from '@/components/onboarding-view';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AuthModal } from '@/components/auth-modal';

export default function Home() {
  // Varsayılan state'ler — SSR ile uyumlu, hydration hatası yok
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedCategory, setSelectedCategory] = useState('Hepsi');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isWriterDashboardOpen, setIsWriterDashboardOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVIPOpen, setIsVIPOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aura-dark-mode');
      if (saved !== null) return saved === 'true';
    }
    // Varsayılan: karanlık tema (layout.tsx'teki hardcoded className="dark" ile uyumlu)
    return true;
  });

  // Onboarding / Safety State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [isEULAOpen, setIsEULAOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    // Güvenli localStorage kontrolü — SSR uyumlu, render döngüsü yok
    const completed =
      localStorage.getItem('has_completed_onboarding') === 'true';

    if (completed) {
      // Daha önce tamamlamış → her şeyi atla, direkt ana sayfa
      setShowSplash(false);
      setShowOnboarding(false);
      setIsLoginModalOpen(false);
    } else {
      // İlk defa geliyor → splash → onboarding akışını başlat
      const timer = setTimeout(() => {
        setShowSplash(false);
        setShowOnboarding(true);
      }, 2800);
      setIsLoading(false);
      return () => clearTimeout(timer);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Hydration koruması: inline script zaten doğru sınıfı ayarladı.
    // Sadece kullanıcı toggle yaptığında değiştir, ilk mount'ta dokunma.
    const html = document.documentElement;
    const hasDark = html.classList.contains('dark');

    if (isDarkMode && !hasDark) {
      html.classList.add('dark');
    } else if (!isDarkMode && hasDark) {
      html.classList.remove('dark');
    }
    localStorage.setItem('aura-dark-mode', String(isDarkMode));
  }, [isDarkMode]);

  const handleSelectStory = (story: Story) => {
    setSelectedStory(story);
    setIsReading(false);
    setIsChatOpen(false);
    setIsSearchOpen(false);
  };

  const handleStartReading = () => {
    setIsReading(true);
  };

  const handleOpenChat = () => {
    setIsChatOpen(true);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setIsLoginModalOpen(true);
  };

  const handleAgeGateComplete = () => {
    // Kullanıcı onboarding + yaş doğrulamasını tamamladı
    // Bir daha gösterilmemesi için localStorage'a kaydet
    localStorage.setItem('has_completed_onboarding', 'true');
    setIsLoginModalOpen(false);
  };

  return (
    <main className="min-h-screen bg-background dark:bg-brand-dark text-foreground dark:text-brand-text max-w-md mx-auto relative overflow-hidden transition-colors duration-500">
      {/* isLoading: useEffect localStorage kontrolü tamamlanana kadar boş ekran.
           İlk ziyarette splash hemen render olur (showSplash=true varsayılan).
           Geri dönen kullanıcıda useEffect anında false yapar → direkt ana sayfa. */}
      {isLoading && !showSplash && (
        <div className="fixed inset-0 z-[999] bg-background" />
      )}

      {showSplash && <SplashScreen />}

      {showOnboarding && <OnboardingView onComplete={handleOnboardingComplete} />}

      {/* Age Gating & EULA Modal */}
      <Dialog open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen}>
        <DialogContent className="max-w-[90%] rounded-[2.5rem] p-8 border-none bg-background/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-headline font-black text-accent">Hoş Geldiniz</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Aura Stories topluluğuna katılmak ve hikayeleri keşfetmek için lütfen onaylayın.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-2xl border border-border/50 my-4">
            <Checkbox
              id="age-check"
              checked={isAgeVerified}
              onCheckedChange={(checked) => setIsAgeVerified(checked as boolean)}
              className="mt-1 border-primary data-[state=checked]:bg-primary"
            />
            <Label htmlFor="age-check" className="text-xs font-medium leading-normal cursor-pointer text-foreground/80">
              18 yaşından büyük olduğumu ve{' '}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEULAOpen(true); }}
                className="text-primary font-bold underline hover:text-accent transition-colors cursor-pointer bg-transparent border-none p-0 inline"
              >
                Kullanıcı Sözleşmesini (EULA)
              </button>
              {' '}okuyup kabul ettiğimi onaylıyorum.
            </Label>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-3">
            <Button
              disabled={!isAgeVerified}
              onClick={handleAgeGateComplete}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-bold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:grayscale transition-all"
            >
              Devam Et
            </Button>
            <p className="text-[10px] text-center text-muted-foreground px-4">
              Aura Stories, güvenli bir okuma ortamı sunmak için UGC içeriklerini denetler.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auth Modal — Giriş Yap / Kayıt Ol */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* EULA Modal */}
      <Dialog open={isEULAOpen} onOpenChange={setIsEULAOpen}>
        <DialogContent className="max-w-[90%] max-h-[80vh] rounded-[2.5rem] p-8 border-none bg-background/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <ScrollText className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-headline font-black text-accent">Kullanıcı Sözleşmesi (EULA)</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Son güncelleme: 4 Temmuz 2026
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[45vh] rounded-2xl border border-border/50 bg-muted/20 p-6">
            <div className="text-sm text-foreground/80 leading-relaxed space-y-4 pr-3">

              <section>
                <h3 className="text-base font-bold text-accent mb-2">1. Taraflar</h3>
                <p>
                  İşbu Kullanıcı Sözleşmesi (&quot;Sözleşme&quot;), Aura Stories platformunu (&quot;Platform&quot;)
                  kullanan kullanıcı (&quot;Kullanıcı&quot;) ile Aura Stories hizmet sağlayıcısı (&quot;Aura Stories&quot;)
                  arasında akdedilmiştir. Platforma erişim sağlayarak ve/veya Platformu kullanarak,
                  işbu Sözleşme&apos;nin tüm hükümlerini okuduğunuzu, anladığınızı ve kayıtsız şartsız
                  kabul ettiğinizi beyan etmiş olursunuz.
                </p>
              </section>

              <section>
                <h3 className="text-base font-bold text-accent mb-2">2. Yaş Sınırlaması</h3>
                <p>
                  Platform, yalnızca 18 (on sekiz) yaşını doldurmuş bireyler tarafından kullanılabilir.
                  Platforma kayıt olarak ve/veya Platformu kullanarak 18 yaşından büyük olduğunuzu
                  beyan ve taahhüt edersiniz. Aura Stories, yaş doğrulaması yapma veya ek belge
                  talep etme hakkını saklı tutar. Yaş sınırını ihlal ettiği tespit edilen
                  kullanıcıların hesapları derhal ve bildirimsiz olarak askıya alınır veya silinir.
                </p>
              </section>

              <section>
                <h3 className="text-base font-bold text-accent mb-2">3. İçerik Politikası</h3>
                <p>
                  Platform, kullanıcıların oluşturduğu içerikleri (User Generated Content — UGC)
                  barındırmaktadır. Aura Stories, nefret söylemi, şiddet teşviki, yasa dışı
                  faaliyetlerin övülmesi, çocukların cinsel istismarı materyali (CSAM),
                  intihara teşvik, terör propagandası ve yürürlükteki yasalara aykırı her türlü
                  içeriği kesinlikle yasaklar. Aura Stories, UGC içeriklerini düzenli olarak
                  denetler ve Sözleşme&apos;ye aykırı içerikleri kaldırma hakkını saklı tutar.
                </p>
              </section>

              <section>
                <h3 className="text-base font-bold text-accent mb-2">4. Kullanıcı Yükümlülükleri</h3>
                <p>
                  Kullanıcı, Platformu yalnızca yasal amaçlarla kullanmayı, başkalarının
                  fikri mülkiyet haklarına saygı göstermeyi, Platformun güvenliğini tehlikeye
                  atacak eylemlerden kaçınmayı ve topluluk kurallarına uymayı kabul eder.
                  Kullanıcı, paylaştığı içeriklerin tüm sorumluluğunu üstlenir.
                </p>
              </section>

              <section>
                <h3 className="text-base font-bold text-accent mb-2">5. Fikri Mülkiyet</h3>
                <p>
                  Platform üzerindeki tüm marka, logo, tasarım, yazılım ve orijinal içerikler
                  Aura Stories&apos;in fikri mülkiyetidir. Kullanıcılar, Platform üzerinde
                  paylaştıkları içeriklerin mülkiyetini korurken, Aura Stories&apos;e bu içerikleri
                  Platform bünyesinde barındırma, görüntüleme ve dağıtma konusunda
                  münhasır olmayan, küresel, geri alınamaz bir lisans vermiş olurlar.
                </p>
              </section>

              <section>
                <h3 className="text-base font-bold text-accent mb-2">6. Gizlilik ve Veri Koruma</h3>
                <p>
                  Aura Stories, kişisel verilerinizi KVKK (6698 sayılı Kişisel Verilerin
                  Korunması Kanunu) ve GDPR (Genel Veri Koruma Tüzüğü) kapsamında işler.
                  Veri toplama, saklama ve işleme politikalarımız hakkında detaylı bilgi
                  için Gizlilik Politikamızı inceleyiniz. Platform, okuma alışkanlıklarınızı
                  ve tercihlerinizi kişiselleştirilmiş öneriler sunmak amacıyla analiz eder.
                </p>
              </section>

              <section>
                <h3 className="text-base font-bold text-accent mb-2">7. Sorumluluk Sınırlaması</h3>
                <p>
                  Aura Stories, Platformun kesintisiz veya hatasız çalışacağını garanti etmez.
                  Platform &quot;olduğu gibi&quot; sunulmaktadır. Aura Stories, Platform kullanımından
                  doğabilecek dolaylı, arızi veya sonuç olarak ortaya çıkan zararlardan
                  sorumlu değildir. Kullanıcı, Platformu kendi sorumluluğunda kullanır.
                </p>
              </section>

              <section>
                <h3 className="text-base font-bold text-accent mb-2">8. Sözleşmenin Feshi</h3>
                <p>
                  Aura Stories, işbu Sözleşme&apos;yi ihlal eden kullanıcıların hesaplarını
                  bildirimli veya bildirimsiz olarak askıya alma, kısıtlama veya
                  tamamen silme hakkına sahiptir. Kullanıcı, hesabını dilediği zaman
                  silerek Sözleşme&apos;yi sonlandırabilir.
                </p>
              </section>

              <section>
                <h3 className="text-base font-bold text-accent mb-2">9. Değişiklikler</h3>
                <p>
                  Aura Stories, işbu Sözleşme&apos;yi önceden bildirimde bulunarak veya
                  bulunmayarak değiştirme hakkını saklı tutar. Güncellenmiş sözleşme
                  Platform&apos;da yayınlandığı andan itibaren yürürlüğe girer. Kullanıcının
                  Platformu kullanmaya devam etmesi, güncellenmiş Sözleşme&apos;yi kabul
                  ettiği anlamına gelir.
                </p>
              </section>

              <section>
                <h3 className="text-base font-bold text-accent mb-2">10. Uygulanacak Hukuk</h3>
                <p>
                  İşbu Sözleşme, Türkiye Cumhuriyeti yasalarına tabidir. Sözleşme&apos;den
                  doğabilecek uyuşmazlıkların çözümünde İstanbul (Çağlayan) Mahkemeleri
                  ve İcra Daireleri yetkilidir.
                </p>
              </section>

              <section className="pt-2 border-t border-border/30">
                <p className="text-muted-foreground text-xs">
                  İletişim: contact@prompthavenai.com<br />
                  Aura Stories — Premium Hikaye ve Roman Okuma Platformu
                </p>
              </section>

            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              onClick={() => setIsEULAOpen(false)}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-bold shadow-lg"
            >
              Okudum, Anladım
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overlay Screens */}
      {isSearchOpen && (
        <SearchView 
          onBack={() => setIsSearchOpen(false)} 
          onSelectStory={handleSelectStory} 
        />
      )}

      {isVIPOpen && (
        <VIPScreen onBack={() => setIsVIPOpen(false)} />
      )}

      {isWriterDashboardOpen && (
        <WriterDashboard onBack={() => setIsWriterDashboardOpen(false)} />
      )}

      {isChatOpen && selectedStory && (
        <CharacterRoom
          story={selectedStory}
          onBack={() => setIsChatOpen(false)}
        />
      )}

      {isReading && selectedStory && (
        <ReadingView 
          story={selectedStory} 
          onBack={() => setIsReading(false)} 
        />
      )}

      {selectedStory && !isReading && !isChatOpen && (
        <BookDetailView 
          story={selectedStory} 
          onBack={() => setSelectedStory(null)} 
          onStartReading={handleStartReading}
          onOpenChat={handleOpenChat}
        />
      )}

      {/* App Header */}
      {!selectedStory && !isReading && !isWriterDashboardOpen && !isChatOpen && !isSearchOpen && !isVIPOpen && (
        <Header onSearchClick={() => setIsSearchOpen(true)} />
      )}

      {/* Tab Content */}
      <div className={`pt-24 pb-28 ${selectedStory || isReading || isWriterDashboardOpen || isChatOpen || isSearchOpen || isVIPOpen ? 'hidden' : ''}`}>
        <div key={activeTab} className="animate-in fade-in duration-500 fill-mode-both">
          {activeTab === 'discover' && <DiscoverScreen onSelectStory={handleSelectStory} selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />}
          {activeTab === 'library' && (
            <LibraryScreen 
              onNavigateToDiscover={() => setActiveTab('discover')} 
              onSelectStory={handleSelectStory}
            />
          )}
          {activeTab === 'rewards' && <RewardsScreen />}
          {activeTab === 'profile' && (
            <ProfileScreen 
              onOpenWriterDashboard={() => setIsWriterDashboardOpen(true)}
              onOpenVIP={() => setIsVIPOpen(true)}
              onOpenLogin={() => setIsAuthModalOpen(true)}
              isDarkMode={isDarkMode}
              onDarkModeToggle={setIsDarkMode}
            />
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      {!selectedStory && !isReading && !isWriterDashboardOpen && !isChatOpen && !isSearchOpen && !isVIPOpen && (
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </main>
  );
}
