
'use client';

import { useState } from 'react';
import {
  Wallet,
  Coins,
  Star,
  Diamond,
  CheckCircle2,
  Clock,
  Play,
  Plus,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { AdRewardModal } from '@/components/ad-reward-modal';
import { useUserState } from '@/lib/user-state';

export function RewardsScreen() {
  const { userState } = useUserState();
  const [checkedIn, setCheckedIn] = useState(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);

  const dailyTasks = [
    { 
      id: 1, 
      title: '15 dakika oku', 
      reward: '5 Bonus', 
      progress: 5, 
      total: 15, 
      icon: Clock, 
      color: 'text-blue-500' 
    },
    { 
      id: 2, 
      title: 'Reklam İzle, Ödül Kazan', 
      reward: '2 Jeton', 
      progress: 0, 
      total: 1, 
      icon: Play, 
      color: 'text-red-500' 
    },
    { 
      id: 3, 
      title: '3 Hikayeyi Kitaplığa Ekle', 
      reward: '10 Puan', 
      progress: 1, 
      total: 3, 
      icon: Plus, 
      color: 'text-green-500' 
    },
    { 
      id: 4, 
      title: 'Yorum Yaz', 
      reward: '3 Bonus', 
      progress: 0, 
      total: 1, 
      icon: MessageSquare, 
      color: 'text-purple-500' 
    },
  ];

  const streakDays = [
    { day: 1, reward: '1 Bonus', active: true, label: 'Bugün' },
    { day: 2, reward: '1 Bonus', active: false, label: 'Pzt' },
    { day: 3, reward: '2 Bonus', active: false, label: 'Sal' },
    { day: 4, reward: '1 Bonus', active: false, label: 'Çar' },
    { day: 5, reward: '1 Bonus', active: false, label: 'Per' },
    { day: 6, reward: '2 Bonus', active: false, label: 'Cum' },
    { day: 7, reward: '5 Jeton', active: false, label: 'Cmt', special: true },
  ];

  return (
    <div className="flex flex-col gap-8 pb-24 px-4">
      {/* Wallet Card */}
      <section>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary via-accent to-primary dark:from-indigo-950 dark:via-purple-900/60 dark:to-zinc-950 dark:border dark:border-zinc-800 p-8 shadow-2xl shadow-primary/20 dark:shadow-black/40">
          <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-5">
            <TrendingUp className="w-32 h-32 rotate-12" />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-white font-bold tracking-tight">Cüzdanım</h2>
          </div>

          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5 text-purple-200">
                <Coins className="w-4 h-4 fill-current" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Jeton</span>
              </div>
              <p className="text-3xl font-headline font-black text-white">{userState.credits}</p>
            </div>
          </div>

          {/* 🎁 Ücretsiz Reklam Butonu */}
          <button
            onClick={() => setIsAdModalOpen(true)}
            className="w-full h-12 rounded-2xl bg-white dark:bg-purple-900/30 text-primary dark:text-purple-200 font-bold shadow-lg hover:bg-white/90 dark:hover:bg-purple-800/40 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Gift className="w-5 h-5" />
            🎁 Ücretsiz Jeton Kazan (Reklam İzle)
          </button>
        </div>
      </section>

      {/* Daily Check-in */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-headline font-bold text-accent">Giriş Serisi</h3>
          <span className="text-xs font-bold text-primary">Seri: 1 Gün 🔥</span>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900/80 dark:border-zinc-800/50 border border-border/50 shadow-sm space-y-6">
          <div className="flex justify-between items-center gap-2">
            {streakDays.map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                  s.active ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" : "bg-muted/50 dark:bg-zinc-800 text-muted-foreground",
                  s.special && !s.active && "border-2 border-dashed border-brand-primary bg-brand-primary/10 dark:bg-brand-primary/20"
                )}>
                  {s.active ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-[10px] font-bold">{s.reward.split(' ')[0]}</span>}
                </div>
                <span className={cn("text-[10px] font-medium", s.active ? "text-primary font-bold" : "text-muted-foreground")}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <Button 
            onClick={() => setCheckedIn(true)}
            disabled={checkedIn}
            className={cn(
              "w-full h-12 rounded-2xl font-bold transition-all",
              checkedIn ? "bg-muted text-muted-foreground" : "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-lg shadow-purple-500/20 active:scale-95"
            )}
          >
            {checkedIn ? 'Ödül Alındı' : 'Bugünkü Ödülü Al (1 Bonus)'}
          </Button>
        </div>
      </section>

      {/* Daily Tasks */}
      <section className="space-y-4">
        <h3 className="text-xl font-headline font-bold text-accent">Günlük Görevler</h3>
        
        <div className="flex flex-col gap-3">
          {dailyTasks.map((task) => {
            const Icon = task.icon;
            const isCompleted = task.progress >= task.total;

            return (
              <div key={task.id} className="p-4 rounded-3xl bg-white dark:bg-zinc-900/80 dark:border-zinc-800/50 border border-border/50 shadow-sm hover:shadow-md transition-shadow active:scale-[0.98] duration-200">
                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-muted/30 dark:bg-zinc-800", task.color)}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-bold text-accent dark:text-zinc-100 truncate">{task.title}</h4>
                      <span className="text-[10px] font-black text-amber-500 dark:text-purple-200 bg-brand-primary/10 dark:bg-brand-primary/20 px-2 py-0.5 rounded-full ring-1 ring-amber-200 dark:ring-amber-500/30">
                        {task.reward}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Progress value={(task.progress / task.total) * 100} className="h-1.5 flex-1" />
                      <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                        {task.progress}/{task.total}
                      </span>
                    </div>
                  </div>

                  <Button 
                    variant={isCompleted ? "ghost" : "outline"}
                    size="sm"
                    className={cn(
                      "rounded-xl h-9 px-4 font-bold text-xs",
                      isCompleted ? "text-green-600" : "border-primary text-primary hover:bg-primary/5"
                    )}
                  >
                    {isCompleted ? 'Alındı' : 'Tamamla'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Redeem Section Link */}
      <button className="flex items-center justify-between p-6 rounded-3xl bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 group active:scale-95 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-bold text-accent dark:text-zinc-100">Puan Mağazası</h4>
            <p className="text-[10px] text-muted-foreground dark:text-zinc-400">Puanlarını harika ödüllere dönüştür</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
      </button>

      {/* ── Ad Reward Modal ── */}
      <AdRewardModal isOpen={isAdModalOpen} onClose={() => setIsAdModalOpen(false)} />
    </div>
  );
}
