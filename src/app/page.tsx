'use client';

import { useState } from 'react';
import { DiscoverScreen } from '@/components/discover-screen';
import { BottomNav } from '@/components/bottom-nav';
import { Header } from '@/components/header';
import { BookDetailView } from '@/components/book-detail-view';
import { ReadingView } from '@/components/reading-view';
import { RewardsScreen } from '@/components/rewards-screen';
import { ProfileScreen } from '@/components/profile-screen';
import { LibraryScreen } from '@/components/library-screen';
import { WriterDashboard } from '@/components/writer-dashboard';
import { Story } from '@/lib/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isWriterDashboardOpen, setIsWriterDashboardOpen] = useState(false);

  const handleSelectStory = (story: Story) => {
    setSelectedStory(story);
    setIsReading(false);
  };

  const handleStartReading = () => {
    setIsReading(true);
  };

  return (
    <main className="min-h-screen bg-background text-foreground max-w-md mx-auto relative overflow-hidden">
      {/* Writer Dashboard Overlay */}
      {isWriterDashboardOpen && (
        <WriterDashboard onBack={() => setIsWriterDashboardOpen(false)} />
      )}

      {/* Reading View Overlay */}
      {isReading && selectedStory && (
        <ReadingView 
          story={selectedStory} 
          onBack={() => setIsReading(false)} 
        />
      )}

      {/* Detail View Overlay */}
      {selectedStory && !isReading && (
        <BookDetailView 
          story={selectedStory} 
          onBack={() => setSelectedStory(null)} 
          onStartReading={handleStartReading}
        />
      )}

      {/* App Header - Hidden when overlays are active */}
      {!selectedStory && !isReading && !isWriterDashboardOpen && <Header />}

      {/* Tab Content */}
      <div className={`pt-24 pb-4 ${selectedStory || isReading || isWriterDashboardOpen ? 'hidden' : ''}`}>
        {activeTab === 'discover' && <DiscoverScreen onSelectStory={handleSelectStory} />}
        {activeTab === 'library' && (
          <LibraryScreen onNavigateToDiscover={() => setActiveTab('discover')} />
        )}
        {activeTab === 'rewards' && <RewardsScreen />}
        {activeTab === 'profile' && (
          <ProfileScreen onOpenWriterDashboard={() => setIsWriterDashboardOpen(true)} />
        )}
      </div>

      {/* Bottom Navigation - Hidden when overlays are active */}
      {!selectedStory && !isReading && !isWriterDashboardOpen && (
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </main>
  );
}
