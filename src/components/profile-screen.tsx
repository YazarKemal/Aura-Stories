
'use client';

import { 
  Settings, 
  ChevronRight, 
  PenTool, 
  Ticket, 
  Award, 
  Download,
  Coins,
  Star,
  Diamond,
  UserCircle,
  Moon,
  Sparkles,
  Clock,
  BookOpen,
  Flame,
  Heart,
  Trophy,
  TreeDeciduous,
  Crown,
  LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ProfileScreenProps {
  onOpenWriterDashboard?: () => void;
  onOpenVIP?: () => void;
  isDarkMode: boolean;
  onDarkModeToggle: (val: boolean) => void;
}

export function ProfileScreen({ onOpenWriterDashboard, onOpenVIP, isDarkMode, onDarkModeToggle }: ProfileScreenProps) {
  const menuItems = [
    { 
      id: 'writer', 
      label: 'Aura Stories Yazarı Ol!', 
      icon: PenTool, 
      highlight: true,
      onClick: onOpenWriterDashboard
    },
    { 
      id: 'coupons', 
      label: 'Kuponlarım', 
      icon: Ticket 
    },
    { 
      id: 'votes', 
      label: 'Aylık Oy', 
      icon: Award 
    },
    { 
      id: 'downloads', 
      label: 'İndirilenler', 
      icon: Download 
    },
    { 
      id: 'settings', 
      label: 'Ayarlar', 
      icon: Settings 
    },
  ];

  const badges = [
    { id: 'owl', icon: Moon, label: 'Gece Kuşu', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
    { id: 'heart', icon: Heart, label: 'Romantik', color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
    { id: 'book', icon: BookOpen, label: 'Kitap Kurdu', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { id: 'trophy', icon: Trophy, label: 'Efsane', color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  ];

  return (
    <div className="flex flex-col gap-6 pb-40 px-6 animate-in fade-in duration-500">
      {/* Profile Header */}
      <section className="flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-white dark:border-white/10 shadow-md">
              <UserCircle className="w-16 h-16 text-muted-foreground" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-headline font-black text-accent">Ziyaretçi_8357</h2>
            <Badge className="bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400 hover:bg-pink-100 border-none text-[10px] w-fit font-bold">
              İlk giriş ödülü
            </Badge>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onOpenWriterDashboard}
          className="rounded-full border-primary/30 text-primary font-bold hover:bg-primary/10 transition-all flex items-center gap-2"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="hidden sm:inline">Yazar Paneli</span>
        </Button>
      </section>

      {/* Aura VIP Banner */}
      <Card 
        onClick={onOpenVIP}
        className="p-5 rounded-[2.5rem] bg-gradient-to-br from-[#1D1231] via-[#2D1B4E] to-[#1D1231] border-none shadow-[0_15px_35px_rgba(155,103,212,0.3)] cursor-pointer group active:scale-[0.98] transition-all overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:rotate-12 transition-transform">
          <Crown className="w-20 h-20 text-amber-400" />
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 backdrop-blur-md flex items-center justify-center text-amber-400 ring-1 ring-amber-400/30">
            <Crown className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-white font-black text-lg tracking-tight">Aura VIP'ye Yükselt</h3>
            <p className="text-amber-400/80 text-[10px] font-bold uppercase tracking-widest">Ayrıcalıklı okuma dünyası</p>
          </div>
          <div className="ml-auto w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </Card>

      {/* Compact Wallet Card */}
      <Card className="p-4 rounded-[2rem] border-none bg-white dark:bg-card shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-4 px-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cüzdanım</span>
          <Button variant="link" className="text-xs font-bold text-primary h-auto p-0">Yükleme Yap</Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-amber-500">
              <Coins className="w-3.5 h-3.5 fill-current" />
              <span className="text-sm font-black">1.2k</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">Jeton</span>
          </div>
          <div className="flex flex-col items-center gap-1 border-x border-border/50">
            <div className="flex items-center gap-1 text-primary">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="text-sm font-black">50</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">Bonus</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-accent">
              <Diamond className="w-3.5 h-3.5 fill-current" />
              <span className="text-sm font-black">420</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">Puan</span>
          </div>
        </div>
      </Card>

      {/* Reading Journey Section */}
      <section className="flex flex-col gap-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Senin Aura'n</h3>
        
        <Card className="p-8 rounded-[2.5rem] border-none bg-gradient-to-br from-primary/10 via-background to-accent/5 shadow-sm overflow-hidden relative">
          <div className="flex flex-col items-center gap-8 relative z-10">
            {/* Aura Tree Central Graphic */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
              <div className="relative w-36 h-36 rounded-full bg-white dark:bg-card flex items-center justify-center shadow-xl border-4 border-white/50 animate-float">
                <div className="flex flex-col items-center">
                  <TreeDeciduous className="w-16 h-16 text-primary drop-shadow-[0_0_15px_rgba(155,103,212,0.6)]" />
                  <div className="absolute -top-1 -right-1">
                    <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
                  </div>
                </div>
                <Badge className="absolute -bottom-2 bg-gradient-to-r from-primary to-accent text-white border-white border-2 text-[10px] font-black px-3 py-1 rounded-full shadow-lg">
                  SEVİYE 5 OKUYUCU
                </Badge>
              </div>
            </div>

            {/* Statistics Mini-Cards */}
            <div className="grid grid-cols-3 gap-3 w-full">
              <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-white/20 shadow-sm transition-transform hover:scale-105">
                <Clock className="w-4 h-4 text-blue-500 mb-1" />
                <span className="text-sm font-black text-accent">12 Saat</span>
                <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Okuma</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-white/20 shadow-sm transition-transform hover:scale-105">
                <BookOpen className="w-4 h-4 text-primary mb-1" />
                <span className="text-sm font-black text-accent">45k</span>
                <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Kelime</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-white/20 shadow-sm transition-transform hover:scale-105">
                <Flame className="w-4 h-4 text-orange-500 mb-1" />
                <span className="text-sm font-black text-accent">7 Gün</span>
                <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Seri</span>
              </div>
            </div>

            {/* Badges Preview */}
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rozetlerim</span>
                <Button variant="link" className="text-[10px] font-bold text-primary h-auto p-0">Tümünü Gör (12)</Button>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-2 px-2 pb-1">
                {badges.map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <div key={badge.id} className="flex flex-col items-center gap-2 flex-shrink-0 group">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1",
                        badge.color
                      )}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[9px] font-bold text-muted-foreground">{badge.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Dark Mode Toggle Row */}
      <Card className="p-4 rounded-[1.5rem] border-none bg-white dark:bg-card shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <span className="text-xl">🌙</span>
          </div>
          <Label htmlFor="dark-mode" className="text-sm font-bold text-accent cursor-pointer">Karanlık Tema</Label>
        </div>
        <Switch 
          id="dark-mode" 
          checked={isDarkMode} 
          onCheckedChange={onDarkModeToggle}
        />
      </Card>

      {/* Menu List */}
      <section className="flex flex-col gap-1">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.id}>
              <button 
                onClick={item.onClick}
                className={cn(
                  "w-full flex items-center justify-between py-4 px-2 group active:bg-muted/50 transition-colors rounded-xl text-left",
                  item.highlight && "text-primary bg-primary/5"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-2 rounded-lg bg-muted/30 dark:bg-white/5 group-hover:bg-primary/10 transition-colors",
                    item.highlight && "bg-primary/10"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={cn(
                    "text-sm font-bold",
                    item.highlight ? "text-primary" : "text-accent"
                  )}>
                    {item.label}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>
              {index < menuItems.length - 1 && <Separator className="bg-border/30 mx-2" />}
            </div>
          );
        })}
      </section>

      {/* Login CTA Card */}
      <div className="mt-4 px-2">
        <Card className="p-6 rounded-[2.5rem] bg-[#2D2D2D] dark:bg-[#1A1A1A] border-none shadow-xl flex flex-col items-center text-center gap-4">
          <div className="space-y-1">
            <h3 className="text-white font-bold text-lg">Hesabınıza Erişin</h3>
            <p className="text-white/60 text-xs">Hikayelerinizi kaydedin ve tüm cihazlarınızdan erişin.</p>
          </div>
          <Button className="w-full h-12 rounded-2xl bg-primary text-white font-black shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
            Giriş Yap / Kayıt Ol
          </Button>
        </Card>
      </div>
    </div>
  );
}
