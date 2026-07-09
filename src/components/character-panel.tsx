'use client';

import { CharacterRoster } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Lock, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CharacterPanelProps {
  characters: { character: CharacterRoster; isUnlocked: boolean }[];
  activeCharacterId: string | null;
  onSelectCharacter: (character: CharacterRoster) => void;
  currentChapter: number;
  totalChapters: number;
}

export function CharacterPanel({
  characters,
  activeCharacterId,
  onSelectCharacter,
  currentChapter,
  totalChapters,
}: CharacterPanelProps) {
  const unlockedCount = characters.filter(c => c.isUnlocked).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-headline font-bold text-accent">
            Karakter Odası
          </h2>
          <Badge className="bg-primary/10 text-primary border-none text-[10px] h-5 px-2">
            {unlockedCount}/{characters.length}
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">
          Bölüm {currentChapter}/{totalChapters}
        </span>
      </div>

      {/* Horizontal scrollable character ribbon */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 pb-2">
        {characters.map(({ character, isUnlocked }) => {
          const isActive = character.id === activeCharacterId;
          const initials = character.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <button
              key={character.id}
              onClick={() => isUnlocked && onSelectCharacter(character)}
              disabled={!isUnlocked}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300 flex-shrink-0 w-[100px]',
                'border-2',
                isActive && isUnlocked
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-105'
                  : isUnlocked
                    ? 'border-white/20 bg-white/40 hover:bg-white/60 hover:border-primary/30 active:scale-95'
                    : 'border-white/10 bg-white/20 opacity-60 cursor-not-allowed'
              )}
            >
              {/* Avatar */}
              <div className="relative">
                <Avatar
                  className={cn(
                    'w-14 h-14 transition-all duration-300',
                    isActive
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md'
                      : 'shadow-sm',
                    !isUnlocked && 'grayscale'
                  )}
                >
                  <AvatarImage
                    src={character.avatarUrl || ''}
                    className="object-cover"
                  />
                  <AvatarFallback
                    className={cn(
                      'font-bold text-sm',
                      isActive
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>

                {/* Lock indicator */}
                {!isUnlocked && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-100 border-2 border-background flex items-center justify-center shadow-sm">
                    <Lock className="w-3 h-3 text-amber-600" />
                  </div>
                )}

                {/* Online dot */}
                {isUnlocked && (
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background',
                      isActive ? 'bg-green-500 shadow-sm shadow-green-500/50' : 'bg-green-400'
                    )}
                  />
                )}
              </div>

              {/* Name */}
              <span
                className={cn(
                  'text-xs font-bold leading-tight text-center line-clamp-1',
                  isActive ? 'text-primary' : 'text-accent'
                )}
              >
                {character.name}
              </span>

              {/* Role or lock info */}
              {isUnlocked ? (
                <span className="text-[9px] text-muted-foreground leading-tight text-center line-clamp-2">
                  {character.role}
                </span>
              ) : (
                <span className="text-[9px] text-amber-600 font-bold leading-tight text-center bg-amber-50 px-2 py-0.5 rounded-full">
                  Böl.{character.unlockedAtChapter}'de Açılır
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
