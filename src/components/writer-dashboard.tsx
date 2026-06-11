'use client';

import { ArrowLeft, Camera, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categories } from '@/lib/mock-data';

interface WriterDashboardProps {
  onBack: () => void;
}

export function WriterDashboard({ onBack }: WriterDashboardProps) {
  return (
    <div className="fixed inset-0 z-[250] bg-background overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-500">
      {/* Top App Bar */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md px-6 py-4 flex items-center border-b border-border/50">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 text-accent hover:bg-muted/50 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="flex-1 text-center font-headline font-black text-accent text-lg pr-8">
          Yeni Hikaye Oluştur
        </h2>
      </header>

      <div className="p-6 pb-32 flex flex-col gap-8 max-w-md mx-auto">
        {/* Book Cover Upload */}
        <section className="space-y-3">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Kitap Kapağı</Label>
          <div className="relative group cursor-pointer">
            <div className="aspect-[2/3] w-40 mx-auto rounded-3xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-3 transition-all group-hover:bg-primary/10 group-hover:border-primary/50">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-primary/60 uppercase tracking-tight">Kapak Yükle</span>
            </div>
          </div>
        </section>

        {/* Metadata Fields */}
        <section className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Hikaye Adı</Label>
            <Input 
              id="title" 
              placeholder="Hikayenize etkileyici bir isim verin" 
              className="h-14 rounded-2xl border-border/50 bg-white/50 focus:bg-white transition-all text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Kategori Seçimi</Label>
            <Select>
              <SelectTrigger className="h-14 rounded-2xl border-border/50 bg-white/50 focus:bg-white text-base">
                <SelectValue placeholder="Bir tür seçin" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50">
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name} className="py-3 rounded-xl">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="synopsis" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Özet</Label>
            <Textarea 
              id="synopsis" 
              placeholder="Okuyucuları hikayenize çekecek çarpıcı bir özet yazın..." 
              className="min-h-[120px] rounded-2xl border-border/50 bg-white/50 focus:bg-white transition-all text-base resize-none"
            />
          </div>
        </section>

        {/* First Chapter Section */}
        <section className="space-y-6 pt-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/50" />
            <h3 className="text-sm font-headline font-bold text-primary uppercase tracking-widest">İlk Bölüm</h3>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chapter-title" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Bölüm Başlığı</Label>
            <Input 
              id="chapter-title" 
              placeholder="Örn: Bölüm 1: Başlangıç" 
              className="h-14 rounded-2xl border-border/50 bg-white/50 focus:bg-white transition-all text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Bölüm İçeriği</Label>
            <Textarea 
              id="content" 
              placeholder="Hikayenizi buraya yazmaya başlayın..." 
              className="min-h-[300px] rounded-2xl border-border/50 bg-white/50 focus:bg-white transition-all text-base font-serif leading-relaxed p-6 resize-none"
            />
          </div>
        </section>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent z-[260]">
        <Button 
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-accent text-white text-lg font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          Hikayeyi Yayımla
        </Button>
      </div>
    </div>
  );
}
