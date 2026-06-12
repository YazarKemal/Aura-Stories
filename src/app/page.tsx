
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
import { SearchView } from '@/components/search-view';
import { VIPScreen } from '@/components/vip-screen';
import { Story } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isWriterDashboardOpen, setIsWriterDashboardOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVIPOpen, setIsVIPOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Onboarding / Safety State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true);
  const [isAgeVerified, setIsAgeVerified] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
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

  return (
    <main className="min-h-screen bg-background text-foreground max-w-md mx-auto relative overflow-hidden transition-colors duration-500">
      
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
              18 yaşından büyük olduğumu ve <span className="text-primary font-bold underline">Kullanıcı Sözleşmesini (EULA)</span> okuyup kabul ettiğimi onaylıyorum.
            </Label>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-3">
            <Button 
              disabled={!isAgeVerified}
              onClick={() => setIsLoginModalOpen(false)}
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
        <CharacterChatView 
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
      <div className={`pt-24 pb-4 ${selectedStory || isReading || isWriterDashboardOpen || isChatOpen || isSearchOpen || isVIPOpen ? 'hidden' : ''}`}>
        <div key={activeTab} className="animate-in fade-in duration-500 fill-mode-both">
          {activeTab === 'discover' && <DiscoverScreen onSelectStory={handleSelectStory} />}
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
              onOpenLogin={() => setIsLoginModalOpen(true)}
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

