
'use client';

import { useState } from 'react';
import { DiscoverScreen } from '@/components/discover-screen';
import { BottomNav } from '@/components/bottom-nav';
import { Header } from '@/components/header';
import { BookDetailView } from '@/components/book-detail-view';
import { Story } from '@/lib/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  const handleSelectStory = (story: Story) => {
    setSelectedStory(story);
  };

  return (
    <main className="min-h-screen bg-background text-foreground max-w-md mx-auto relative overflow-hidden">
      {/* Detail View Overlay */}
      {selectedStory && (
        <BookDetailView 
          story={selectedStory} 
          onBack={() => setSelectedStory(null)} 
        />
      )}

      {/* App Header - Hidden when detail view is active */}
      {!selectedStory && <Header />}

      {/* Tab Content */}
      <div className={`pt-24 pb-4 ${selectedStory ? 'hidden' : ''}`}>
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
        {activeTab === 'rewards' && (
          <div className="px-4 flex flex-col gap-6 animate-in slide-in-from-bottom-8 duration-500">
             <h2 className="text-2xl font-headline font-bold text-accent">Ödüller ve Başarımlar</h2>
             <div className="p-6 rounded-3xl bg-gradient-to-br from-primary to-accent text-white shadow-xl">
                <p className="text-xs opacity-80 mb-1">Toplam Aura Puanı</p>
                <h3 className="text-4xl font-headline font-bold">1,450</h3>
                <div className="mt-6 flex justify-between items-end">
                  <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-white/20 backdrop-blur-sm" />
                    ))}
                  </div>
                  <button className="bg-white text-accent px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">Puan Kullan</button>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
               {[
                 { t: 'Gece Kuşu', d: 'Saat 23:00\'den sonra oku', icon: '🌙' },
                 { t: 'Hızlı Okur', d: '10 bölüm bitir', icon: '⚡' },
                 { t: 'Yorumcu', d: '5 yorum yaz', icon: '💬' },
                 { t: 'Kaşif', d: '3 farklı tür oku', icon: '🧭' }
               ].map((b, i) => (
                 <div key={i} className="p-4 rounded-2xl glass-morphism flex flex-col items-center text-center gap-2">
                   <span className="text-3xl">{b.icon}</span>
                   <h4 className="font-bold text-sm">{b.t}</h4>
                   <p className="text-[10px] text-muted-foreground">{b.d}</p>
                 </div>
               ))}
             </div>
          </div>
        )}
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

      {/* Bottom Navigation - Hidden when detail view is active */}
      {!selectedStory && <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />}
    </main>
  );
}
