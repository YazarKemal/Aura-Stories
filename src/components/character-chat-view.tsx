'use client';

import { useState, useRef, useEffect } from 'react';
import { Story } from '@/lib/types';
import { ArrowLeft, Send, MoreHorizontal, ShieldCheck, Sparkles, Coins } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface CharacterChatViewProps {
  story: Story;
  onBack: () => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'character' | 'user';
  timestamp: Date;
}

export function CharacterChatView({ story, onBack }: CharacterChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Buraya gelmeni beklemiyordum. Gerçekten o kadar cesur musun?",
      sender: 'character',
      timestamp: new Date(),
    },
    {
      id: '2',
      text: "Bana ne söylemek istiyorsan söyle, ama vaktimi boşa harcama. Ne istiyorsun?",
      sender: 'character',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages([...messages, newMessage]);
    setInputText('');
  };

  const characterName = story.tags?.[0] || "Ana Karakter";

  return (
    <div className="fixed inset-0 z-[300] bg-background flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
      {/* Immersive Blurred Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src={story.imageUrl}
          alt="Chat background"
          fill
          className="object-cover blur-[100px] opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      </div>

      {/* Chat Header */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between glass-morphism border-b border-white/10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-accent hover:bg-white/10 rounded-full transition-colors active:scale-90"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10 border-2 border-primary shadow-sm">
                <AvatarImage src={story.imageUrl} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {characterName[0]}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white ring-1 ring-green-600/20" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-bold text-accent leading-none flex items-center gap-1">
                {characterName}
                <ShieldCheck className="w-3 h-3 text-primary" />
              </h3>
              <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider animate-pulse">Çevrimiçi</span>
            </div>
          </div>
        </div>
        <button className="p-2 text-muted-foreground hover:bg-white/10 rounded-full">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </header>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto p-6 flex flex-col gap-6 no-scrollbar"
      >
        <div className="self-center py-2 px-4 rounded-full bg-white/40 backdrop-blur-sm border border-white/20 text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-2">
           <Sparkles className="w-3 h-3 text-primary" />
           AI KARAKTER ODASI AKTİF
        </div>

        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={cn(
              "max-w-[85%] flex flex-col gap-1",
              msg.sender === 'user' ? "self-end items-end" : "self-start items-start"
            )}
          >
            <div className={cn(
              "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
              msg.sender === 'user' 
                ? "bg-primary text-white rounded-tr-none" 
                : "bg-white/80 backdrop-blur-md text-accent border border-white/50 rounded-tl-none"
            )}>
              {msg.text}
            </div>
            <span className="text-[9px] text-muted-foreground font-medium">
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>

      {/* Message Input Container */}
      <footer className="relative z-10 p-6 pt-2 bg-gradient-to-t from-background via-background to-transparent">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-3 py-1 self-center bg-amber-50 rounded-full border border-amber-200">
             <Coins className="w-3 h-3 text-amber-500 fill-current" />
             <span className="text-[10px] font-bold text-amber-700">Mesaj başına 5 Jeton</span>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-2 rounded-[2rem] shadow-2xl border border-primary/10">
            <Input 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Karaktere bir şey yaz..."
              className="border-none bg-transparent focus-visible:ring-0 text-sm h-12 rounded-full px-4"
            />
            <Button 
              onClick={handleSendMessage}
              className="w-12 h-12 rounded-full bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all p-0 flex items-center justify-center"
            >
              <Send className="w-5 h-5 -mr-0.5 mt-0.5" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
