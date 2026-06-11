'use client';

import { useState } from 'react';
import { DiscoverScreen } from '@/components/discover-screen';
import { BottomNav } from '@/components/bottom-nav';
import { Header } from '@/components/header';
import { BookDetailView } from '@/components/book-detail-view';
import { ReadingView } from '@/components/reading-view';
import { RewardsScreen } from '@/components/rewards-screen';
import { Story } from '@/lib/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isReading, setIsReading] = useState(false);

  const handleSelectStory = (story: Story) => {
    setSelectedStory(story);
    setIsReading(false);
  };

  const handleStartReading = () => {
    setIsReading(true);
  };

  return (
    <main className="min-h-screen bg-background text-foreground max-w-md mx-auto relative overflow-hidden">
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
      {!selectedStory && !isReading && <Header />}

      {/* Tab Content */}
      <div className={`pt-24 pb-4 ${selectedStory || isReading ? 'hidden' : ''}`}>
        {activeTab === 'discover' && <DiscoverScreen onSelectStory={handleSelectStory} />}
        {activeTab === 'library' && (
          <div className="px-4 flex flex-col items-center justify-center h-[60vh] text-center gap-4 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
               <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
            <h2 className="text-2xl font-headline font-bold text-accent">Kitaplığınız Boş</h2>
            <p className="text-muted-foreground">Keşfet sekmesinden yeni hikayeler ekleyerek okumaya başlayabilirsiniz.</p>
          </div>
        )}
        {activeTab === 'rewards' && <RewardsScreen />}
        {activeTab === 'profile' && (
          <div className="px-4 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-accent ring-4 ring-white shadow-lg overflow-hidden relative">
                 <img src="https://picsum.photos/seed/user1/200" alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-2xl font-headline font-bold text-accent">Aura Kullanıcısı</h2>
                <p className="text-sm text-muted-foreground">Premium Üye • İstanbul</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {['Hesap Ayarları', 'Bildirimler', 'Gizlilik ve Güvenlik', 'Yardım Merkezi', 'Hakkında'].map((item, i) => (
                <button key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-border/50 hover:bg-muted/50 transition-colors">
                  <span className="text-sm font-medium">{item}</span>
                  <span className="text-muted-foreground opacity-50">→</span>
                </button>
              ))}
              <button className="mt-4 p-4 rounded-2xl bg-destructive/10 text-destructive text-sm font-bold">Çıkış Yap</button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation - Hidden when overlays are active */}
      {!selectedStory && !isReading && <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />}
    </main>
  );
}
