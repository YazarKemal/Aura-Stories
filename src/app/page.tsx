
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

export default function Home() {
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isWriterDashboardOpen, setIsWriterDashboardOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVIPOpen, setIsVIPOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

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
