
'use client';

import { useState } from 'react';
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
  LayoutDashboard,
  LogIn,
  Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AdRewardModal } from '@/components/ad-reward-modal';
import { useUserState } from '@/lib/user-state';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProfileScreenProps {
  onOpenWriterDashboard?: () => void;
  onOpenVIP?: () => void;
  onOpenLogin?: () => void;
  isDarkMode: boolean;
  onDarkModeToggle: (val: boolean) => void;
}

export function ProfileScreen({ onOpenWriterDashboard, onOpenVIP, onOpenLogin, isDarkMode, onDarkModeToggle }: ProfileScreenProps) {
  const { toast } = useToast();
  const { userState, logout, isGiftClaimedToday, claimDailyGift } = useUserState();
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const currentUser = userState.user;
  const dailyGiftClaimed = isGiftClaimedToday;

  // ── Menu Sheet States ─────────────────────────────────────
  const [isCouponsOpen, setIsCouponsOpen] = useState(false);
  const [isVotesOpen, setIsVotesOpen] = useState(false);
  const [isDownloadsOpen, setIsDownloadsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ── Coupon State ──────────────────────────────────────────
  const [couponCode, setCouponCode] = useState('');
  
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
      icon: Ticket,
      onClick: () => setIsCouponsOpen(true),
    },
    {
      id: 'votes',
      label: 'Aylık Oy',
      icon: Award,
      onClick: () => setIsVotesOpen(true),
    },
    {
      id: 'downloads',
      label: 'İndirilenler',
      icon: Download,
      onClick: () => setIsDownloadsOpen(true),
    },
    {
      id: 'settings',
      label: 'Ayarlar',
      icon: Settings,
      onClick: () => setIsSettingsOpen(true),
    },
  ];

  const badges = [
    { id: 'owl', icon: Moon, label: 'Gece Kuşu', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
    { id: 'heart', icon: Heart, label: 'Romantik', color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
    { id: 'book', icon: BookOpen, label: 'Kitap Kurdu', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { id: 'trophy', icon: Trophy, label: 'Efsane', color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  ];

  const handleClaimDailyGift = async () => {
    if (dailyGiftClaimed) return;
    const ok = await claimDailyGift();
    if (ok) {
      toast({
        title: "Hediye Alındı!",
        description: "Günlük Aura Hediyen olarak 50🪙 hesabına eklendi.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-40 px-6">
      {/* Profile Header */}
      <section className="flex items-center justify-between py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center overflow-hidden border-2 shadow-md",
              currentUser
                ? "border-primary/30 bg-primary/10"
                : "bg-muted border-white dark:border-white/10"
            )}>
              {currentUser ? (
                <span className="text-2xl font-black text-primary">{currentUser.name[0].toUpperCase()}</span>
              ) : (
                <UserCircle className="w-16 h-16 text-muted-foreground" />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-headline font-black text-accent">
              {currentUser ? currentUser.name : 'Ziyaretçi_8357'}
            </h2>
            {currentUser ? (
              <Badge className="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 border-none text-[10px] w-fit font-bold">
                {currentUser.email}
              </Badge>
            ) : (
              <Badge className="bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400 hover:bg-pink-100 border-none text-[10px] w-fit font-bold">
                İlk giriş ödülü
              </Badge>
            )}
          </div>
        </div>
        {currentUser ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLogoutConfirmOpen(true)}
            className="rounded-full border-red-200 dark:border-red-800 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
          >
            Çıkış Yap
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenWriterDashboard}
            className="rounded-full border-primary/30 text-primary font-bold hover:bg-primary/10 transition-all flex items-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Yazar Paneli</span>
          </Button>
        )}
      </section>

      {/* Daily Reward Card */}
      <Card className="p-6 rounded-[2.5rem] bg-gradient-to-br from-brand-primary/10 via-primary/5 to-brand-secondary/10 border-none shadow-xl relative overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
         <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-primary/10 rounded-full blur-3xl animate-pulse" />
         <div className="flex flex-col items-center gap-4 relative z-10 text-center">
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-headline font-black text-accent leading-none">Günlük Aura Hediyen</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Seni özledik, işte bugünkü hediyen!</p>
            </div>
            
            <div className="relative">
               <div className={cn(
                 "absolute inset-0 bg-brand-primary blur-2xl rounded-full opacity-0 transition-opacity duration-500",
                 !dailyGiftClaimed && "opacity-30 group-hover:opacity-50"
               )} />
               <div className={cn(
                 "relative w-24 h-24 rounded-3xl bg-white dark:bg-card flex items-center justify-center shadow-lg border-2 border-brand-primary/30 transition-transform duration-500",
                 !dailyGiftClaimed ? "animate-float" : "grayscale opacity-50"
               )}>
                  <Gift className={cn("w-12 h-12 text-amber-500", !dailyGiftClaimed && "animate-pulse")} />
                  {!dailyGiftClaimed && <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-brand-primary animate-pulse" />}
               </div>
            </div>

            <Button 
              onClick={handleClaimDailyGift}
              disabled={dailyGiftClaimed}
              className={cn(
                "w-full h-12 rounded-2xl font-black text-sm transition-all shadow-lg",
                dailyGiftClaimed 
                  ? "bg-muted text-muted-foreground shadow-none" 
                  : "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-purple-500/20 hover:scale-[1.02] active:scale-95 animate-pulse-subtle"
              )}
            >
              {dailyGiftClaimed ? "Alındı! (+50🪙)" : "Hediyeni Al"}
            </Button>
         </div>
      </Card>

      {/* Aura VIP Banner */}
      <Card
        aria-label="VIP üyelik"
        role="button"
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

      {/* Cüzdan + Reklam Kartı */}
      <Card className="p-6 rounded-[2.5rem] border-none bg-white dark:bg-card shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col items-center gap-4">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cüzdanım</span>

          <div className="flex items-center justify-center gap-4 w-full">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1 text-amber-500">
                <Coins className="w-5 h-5 fill-current" />
                <span className="text-2xl font-black">{userState.credits}</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Jeton</span>
            </div>
          </div>

          {/* Reklam İzle Butonu */}
          <button
            onClick={() => setIsAdModalOpen(true)}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-brand-primary to-brand-secondary active:scale-95 hover:opacity-90 transition-all dark:from-purple-600 dark:to-indigo-600 text-white font-black text-sm shadow-lg shadow-purple-500/20 dark:shadow-purple-900/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <Gift className="w-5 h-5" />
            🎁 Ücretsiz Jeton Kazan (Reklam İzle)
          </button>
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
                    <Sparkles className="w-6 h-6 text-brand-primary animate-pulse" />
                  </div>
                </div>
                <Badge className="absolute -bottom-2 bg-gradient-to-r from-primary to-accent text-white border-white border-2 text-[10px] font-black px-3 py-1 rounded-full shadow-lg">
                  SEVİYE {userState.level} OKUYUCU
                </Badge>
              </div>
            </div>

            {/* Statistics Mini-Cards */}
            <div className="grid grid-cols-3 gap-3 w-full">
              <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-white/20 shadow-sm transition-transform hover:scale-105">
                <Clock className="w-4 h-4 text-blue-500 mb-1" />
                <span className="text-sm font-black text-accent">{userState.readHours} Saat</span>
                <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Okuma</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-white/20 shadow-sm transition-transform hover:scale-105">
                <BookOpen className="w-4 h-4 text-primary mb-1" />
                <span className="text-sm font-black text-accent">{userState.wordsRead.toLocaleString()}</span>
                <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Kelime</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-white/20 shadow-sm transition-transform hover:scale-105">
                <Flame className="w-4 h-4 text-orange-500 mb-1" />
                <span className="text-sm font-black text-accent">{userState.streak} Gün</span>
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

      {/* Auth Card — logged out vs logged in */}
      <div className="mt-4 px-2">
        {currentUser ? (
          <Card className="p-6 rounded-[2.5rem] bg-[#2D2D2D] dark:bg-[#1A1A1A] border-none shadow-xl flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-black">
              {currentUser.name[0].toUpperCase()}
            </div>
            <div className="space-y-1">
              <h3 className="text-white font-bold text-lg">{currentUser.name}</h3>
              <p className="text-white/60 text-xs">{currentUser.email}</p>
            </div>
            <Button
              onClick={() => setLogoutConfirmOpen(true)}
              variant="outline"
              className="w-full h-12 rounded-2xl border-red-200 dark:border-red-800 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Çıkış Yap
            </Button>
          </Card>
        ) : (
          <Card className="p-6 rounded-[2.5rem] bg-[#2D2D2D] dark:bg-[#1A1A1A] border-none shadow-xl flex flex-col items-center text-center gap-4">
            <div className="space-y-1">
              <h3 className="text-white font-bold text-lg">Hesabınıza Erişin</h3>
              <p className="text-white/60 text-xs">Hikayelerinizi kaydedin ve tüm cihazlarınızdan erişin.</p>
            </div>
            <Button
              aria-label="Giriş yap"
              onClick={onOpenLogin}
              className="w-full h-12 rounded-2xl bg-primary text-white font-black shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Giriş Yap / Kayıt Ol
            </Button>
          </Card>
        )}
      </div>

      {/* ── Ad Reward Modal ── */}
      <AdRewardModal isOpen={isAdModalOpen} onClose={() => setIsAdModalOpen(false)} />

      {/* ══════════════════════════════════════════════════════ */}
      {/* 🎫 Kuponlarım Sheet */}
      {/* ══════════════════════════════════════════════════════ */}
      <Sheet open={isCouponsOpen} onOpenChange={setIsCouponsOpen}>
        <SheetContent side="bottom" className="rounded-t-[3rem] bg-card p-0 border-none animate-in slide-in-from-bottom duration-500 z-[600]">
          <div className="p-8 flex flex-col gap-6">
            <div className="w-12 h-1.5 bg-muted rounded-full self-center" />
            <SheetHeader className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-500 mb-2">
                <Ticket className="w-8 h-8" />
              </div>
              <SheetTitle className="text-xl font-headline font-black text-accent">Kupon Kodu Kullan</SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                Etkinliklerden veya yazarlardan kazandığın özel kodları burada kullanabilirsin.
              </SheetDescription>
            </SheetHeader>

            <Input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Kupon kodunu gir (örn: AURA2026)"
              className="h-14 rounded-2xl text-center text-sm font-bold border-2 border-dashed border-primary/30 bg-primary/5"
            />

            <Button
              disabled={!couponCode.trim()}
              onClick={() => {
                toast({
                  title: "🎉 Kupon Onaylandı!",
                  description: `"${couponCode}" kodu ile +20 Jeton hesabına eklendi.`,
                });
                setCouponCode('');
                setIsCouponsOpen(false);
              }}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-brand-primary to-brand-secondary active:scale-95 hover:opacity-90 transition-all text-white font-black shadow-lg disabled:opacity-40"
            >
              Kodu Kullan (+20🪙)
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ══════════════════════════════════════════════════════ */}
      {/* 🗳️ Aylık Oy Sheet */}
      {/* ══════════════════════════════════════════════════════ */}
      <Sheet open={isVotesOpen} onOpenChange={setIsVotesOpen}>
        <SheetContent side="bottom" className="rounded-t-[3rem] bg-card p-0 border-none animate-in slide-in-from-bottom duration-500 z-[600]">
          <div className="p-8 flex flex-col gap-6 max-h-[70vh] overflow-y-auto no-scrollbar">
            <div className="w-12 h-1.5 bg-muted rounded-full self-center" />
            <SheetHeader className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-500 mb-2">
                <Award className="w-8 h-8" />
              </div>
              <SheetTitle className="text-xl font-headline font-black text-accent">Ayın Hikayesi Oylaması</SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                Bu ayın en sevdiğin hikayesine oy vererek yazarına destek ol!
              </SheetDescription>
            </SheetHeader>

            {[
              { title: 'Gece Yarısı Güneşi', author: 'Elif K.', votes: 1240, genre: 'Romantik' },
              { title: 'Sokakların Kanunu', author: 'Mert D.', votes: 980, genre: 'Mafya' },
              { title: 'Son Nefes', author: 'Zeynep A.', votes: 756, genre: 'Dram' },
              { title: 'Kayıp Zamanın İzinde', author: 'Can B.', votes: 612, genre: 'Gizem' },
            ].map((story, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-border/30">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-black text-primary">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-accent truncate">{story.title}</p>
                  <p className="text-[10px] text-muted-foreground">{story.author} · {story.genre} · {story.votes} oy</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    toast({ title: "✅ Oy Verildi!", description: `"${story.title}" için oyun kaydedildi.` });
                    setIsVotesOpen(false);
                  }}
                  className="rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold text-xs h-9 px-4"
                >
                  Oy Ver
                </Button>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* ══════════════════════════════════════════════════════ */}
      {/* 📥 İndirilenler Sheet */}
      {/* ══════════════════════════════════════════════════════ */}
      <Sheet open={isDownloadsOpen} onOpenChange={setIsDownloadsOpen}>
        <SheetContent side="bottom" className="rounded-t-[3rem] bg-card p-0 border-none animate-in slide-in-from-bottom duration-500 z-[600]">
          <div className="p-8 flex flex-col gap-6">
            <div className="w-12 h-1.5 bg-muted rounded-full self-center" />
            <SheetHeader className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 mb-2">
                <Download className="w-8 h-8" />
              </div>
              <SheetTitle className="text-xl font-headline font-black text-accent">Çevrimdışı Okuma</SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                İndirdiğin hikayeleri internete bağlı olmadan okuyabilirsin.
              </SheetDescription>
            </SheetHeader>

            {/* Empty state */}
            <div className="flex flex-col items-center gap-4 py-8 px-6 rounded-2xl bg-muted/20 border border-dashed border-border/50">
              <BookOpen className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground text-center font-medium">
                Henüz çevrimdışı okumak için bir hikaye indirmediniz.
              </p>
              <p className="text-[10px] text-muted-foreground/60 text-center">
                Keşfet sekmesinden bir hikaye seçip indirme butonuna dokunarak çevrimdışı kitaplığını oluşturabilirsin.
              </p>
            </div>

            <Button
              onClick={() => setIsDownloadsOpen(false)}
              variant="outline"
              className="w-full h-12 rounded-2xl border-primary/30 text-primary font-bold"
            >
              Keşfet'e Git
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ⚙️ Ayarlar Sheet */}
      {/* ══════════════════════════════════════════════════════ */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent side="bottom" className="rounded-t-[3rem] bg-card p-0 border-none animate-in slide-in-from-bottom duration-500 z-[600]">
          <div className="p-8 flex flex-col gap-6 max-h-[75vh] overflow-y-auto no-scrollbar">
            <div className="w-12 h-1.5 bg-muted rounded-full self-center" />
            <SheetHeader className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-900/30 flex items-center justify-center text-gray-500 mb-2">
                <Settings className="w-8 h-8" />
              </div>
              <SheetTitle className="text-xl font-headline font-black text-accent">Ayarlar</SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                Uygulama tercihlerini ve hesap ayarlarını yönet.
              </SheetDescription>
            </SheetHeader>

            {/* Bildirimler */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-accent">Bildirimler</span>
                <span className="text-[10px] text-muted-foreground">Yeni bölüm ve özel teklifler</span>
              </div>
              <Switch defaultChecked />
            </div>

            {/* Karanlık Tema (mevcut) */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20">
              <div className="flex items-center gap-3">
                <span className="text-xl">🌙</span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-accent">Karanlık Tema</span>
                  <span className="text-[10px] text-muted-foreground">Göz yormayan okuma modu</span>
                </div>
              </div>
              <Switch checked={isDarkMode} onCheckedChange={onDarkModeToggle} />
            </div>

            {/* Hesap Bilgileri */}
            <div className="p-4 rounded-2xl bg-muted/20 flex flex-col gap-2">
              <span className="text-sm font-bold text-accent">Hesap Bilgileri</span>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Kullanıcı Adı</span>
                <span className="font-bold text-accent">Ziyaretçi_8357</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>E-posta</span>
                <span className="font-bold text-accent">ziyaretci@aurastories.com</span>
              </div>
            </div>

            <Separator className="bg-border/30" />

            {/* Hesap İşlemleri */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setLogoutConfirmOpen(true);
                }}
                className="w-full h-12 rounded-2xl border-red-200 text-red-600 font-bold hover:bg-red-50"
              >
                Çıkış Yap
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  toast({
                    title: "⚠️ Hesap Silme Talebi",
                    description: "Hesap silme talebiniz alındı. 30 gün içinde işleme alınacak.",
                    variant: "destructive",
                  });
                  setIsSettingsOpen(false);
                }}
                className="w-full h-12 rounded-2xl border-red-300 text-red-700 font-bold hover:bg-red-50"
              >
                Hesabı Sil
              </Button>
            </div>

            <Separator className="bg-border/30" />

            {/* Yasal */}
            <div className="text-center space-y-2">
              <button
                onClick={() => {
                  setIsSettingsOpen(false);
                  setTimeout(() => onOpenLogin?.(), 300);
                }}
                className="text-[11px] text-primary font-bold underline hover:text-accent transition-colors"
              >
                Kullanıcı Sözleşmesi (EULA)
              </button>
              <p className="text-[10px] text-muted-foreground">
                Sürüm 1.0.0 · Aura Stories
              </p>
              <p className="text-[10px] text-muted-foreground">
                İletişim: contact@prompthavenai.com
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Çıkış Onay Kutusu */}
      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent className="max-w-[90%] rounded-[2.5rem] border-border/50 dark:bg-zinc-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-headline font-black text-accent">
              Çıkış Yap
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Hesabından çıkmak istediğine emin misin?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:flex-row">
            <AlertDialogCancel className="flex-1 h-12 rounded-2xl font-bold mt-0">
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                logout();
                toast({ title: "Çıkış Yapıldı", description: "Hesabından güvenle çıkış yapıldı." });
              }}
              className="flex-1 h-12 rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              Çıkış Yap
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
