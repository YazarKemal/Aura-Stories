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
import { Story } from '@/lib/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isWriterDashboardOpen, setIsWriterDashboardOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
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
  };

  const handleStartReading = () => {
    setIsReading(true);
  };

  const handleOpenChat = () => {
    setIsChatOpen(true);
  };

  return (
    <main className="min-h-screen bg-background text-foreground max-w-md mx-auto relative overflow-hidden transition-colors duration-500">
      {/* Writer Dashboard Overlay */}
      {isWriterDashboardOpen && (
        <WriterDashboard onBack={() => setIsWriterDashboardOpen(false)} />
      )}

      {/* Character Chat Overlay */}
      {isChatOpen && selectedStory && (
        <CharacterChatView 
          story={selectedStory} 
          onBack={() => setIsChatOpen(false)} 
        />
      )}

      {/* Reading View Overlay */}
      {isReading && selectedStory && (
        <ReadingView 
          story={selectedStory} 
          onBack={() => setIsReading(false)} 
        />
      )}

      {/* Detail View Overlay */}
      {selectedStory && !isReading && !isChatOpen && (
        <BookDetailView 
          story={selectedStory} 
          onBack={() => setSelectedStory(null)} 
          onStartReading={handleStartReading}
          onOpenChat={handleOpenChat}
        />
      )}

      {/* App Header - Hidden when overlays are active */}
      {!selectedStory && !isReading && !isWriterDashboardOpen && !isChatOpen && <Header />}

      {/* Tab Content with Soft Fade Transition */}
      <div className={`pt-24 pb-4 ${selectedStory || isReading || isWriterDashboardOpen || isChatOpen ? 'hidden' : ''}`}>
        <div key={activeTab} className="animate-in fade-in duration-500 fill-mode-both">
          {activeTab === 'discover' && <DiscoverScreen onSelectStory={handleSelectStory} />}
          {activeTab === 'library' && (
            <LibraryScreen onNavigateToDiscover={() => setActiveTab('discover')} />
          )}
          {activeTab === 'rewards' && <RewardsScreen />}
          {activeTab === 'profile' && (
            <ProfileScreen 
              onOpenWriterDashboard={() => setIsWriterDashboardOpen(true)}
              isDarkMode={isDarkMode}
              onDarkModeToggle={setIsDarkMode}
            />
          )}
        </div>
      </div>

      {/* Bottom Navigation - Hidden when overlays are active */}
      {!selectedStory && !isReading && !isWriterDashboardOpen && !isChatOpen && (
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </main>
  );
}