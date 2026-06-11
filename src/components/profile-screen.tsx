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
  UserCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ProfileScreenProps {
  onOpenWriterDashboard?: () => void;
}

export function ProfileScreen({ onOpenWriterDashboard }: ProfileScreenProps) {
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

  return (
    <div className="flex flex-col gap-6 pb-40 px-6 animate-in fade-in duration-500">
      {/* Profile Header */}
      <section className="flex items-center gap-4 py-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
            <UserCircle className="w-16 h-16 text-muted-foreground" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-headline font-black text-accent">Ziyaretçi_8357</h2>
          <Badge className="bg-pink-100 text-pink-600 hover:bg-pink-100 border-none text-[10px] w-fit font-bold">
            İlk giriş ödülü
          </Badge>
        </div>
      </section>

      {/* Compact Wallet Card */}
      <Card className="p-4 rounded-[2rem] border-none bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
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

      {/* Menu List */}
      <section className="flex flex-col gap-1">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.id}>
              <button 
                onClick={item.onClick}
                className={cn(
                  "w-full flex items-center justify-between py-4 px-2 group active:bg-muted/50 transition-colors rounded-xl",
                  item.highlight && "text-primary bg-primary/5"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-2 rounded-lg bg-muted/30 group-hover:bg-primary/10 transition-colors",
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
        <Card className="p-6 rounded-[2.5rem] bg-[#2D2D2D] border-none shadow-xl flex flex-col items-center text-center gap-4">
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
