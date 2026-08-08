'use client';

import { useEffect, useState } from 'react';
import { EyeOff, Lock, Sparkles, UserRound, Users } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  saveReaderPersona,
  type CharacterEchoVisibility,
  type IdentityDisclosure,
  type ReaderPersona,
} from '@/lib/reader-persona';

interface ReaderPersonaEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  persona: ReaderPersona;
  onSave: (persona: ReaderPersona) => void;
}

export function ReaderPersonaEditor({
  open,
  onOpenChange,
  storyId,
  persona,
  onSave,
}: ReaderPersonaEditorProps) {
  const [name, setName] = useState(persona.name);
  const [role, setRole] = useState(persona.role);
  const [traits, setTraits] = useState(persona.traits.join(', '));
  const [note, setNote] = useState(persona.note);
  const [identityDisclosure, setIdentityDisclosure] = useState<IdentityDisclosure>(persona.identityDisclosure);
  const [echoVisibility, setEchoVisibility] = useState<CharacterEchoVisibility>(persona.echoVisibility);

  useEffect(() => {
    if (!open) return;
    setName(persona.name);
    setRole(persona.role);
    setTraits(persona.traits.join(', '));
    setNote(persona.note);
    setIdentityDisclosure(persona.identityDisclosure);
    setEchoVisibility(persona.echoVisibility);
  }, [open, persona]);

  const handleSave = () => {
    const next: ReaderPersona = {
      name: name.trim().slice(0, 80) || persona.name,
      role: role.trim().slice(0, 80) || 'Hikâyenin Misafiri',
      traits: traits
        .split(',')
        .map(value => value.trim())
        .filter(Boolean)
        .slice(0, 6)
        .map(value => value.slice(0, 60)),
      note: note.trim().slice(0, 500),
      identityDisclosure,
      echoVisibility,
    };
    saveReaderPersona(next, storyId);
    onSave(next);
    onOpenChange(false);
  };

  const identityOptions: {
    id: IdentityDisclosure;
    title: string;
    description: string;
    icon: typeof UserRound;
  }[] = [
    {
      id: 'contextual',
      title: 'Bağlama göre öğrenilsin',
      description: 'Önerilen. Karakterler adını ancak konuşmada söylersen veya olaylar seni tanınır hale getirirse bilir.',
      icon: Sparkles,
    },
    {
      id: 'always',
      title: 'Kimliğim baştan bilinsin',
      description: 'Bu hikâye dalında tercih ettiğin ad ve rol karakterlerce biliniyor kabul edilir.',
      icon: Users,
    },
    {
      id: 'anonymous',
      title: 'Kimliğimi gizle',
      description: 'Hikâyeye etki edebilirsin ama gerçek/tercih edilen adın otomatik olarak karakterlere açıklanmaz.',
      icon: EyeOff,
    },
  ];

  const echoOptions: {
    id: CharacterEchoVisibility;
    title: string;
    description: string;
  }[] = [
    {
      id: 'private',
      title: 'Sadece benim hikâye dalım',
      description: 'Başka kullanıcılar bu branch’i okusa bile senin AI Character Echo’n açılmaz.',
    },
    {
      id: 'shared',
      title: 'Character Echo’ya izin ver',
      description: 'Hikâye paylaşılırsa, bu evrendeki davranış ve ilişkilerinden oluşan AI karakterin başkalarıyla konuşabilir.',
    },
    {
      id: 'anonymous',
      title: 'Anonim Echo’ya izin ver',
      description: 'AI Character Echo kullanılabilir ama Aura hesabınla bağlantılı kimlik bilgisi gösterilmez.',
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        overlayClassName="z-[640]"
        className="z-[650] max-h-[90dvh] rounded-t-[2.5rem] border-white/10 bg-background/95 backdrop-blur-2xl px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-4 overflow-y-auto"
      >
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-muted" />
        <SheetHeader className="text-left mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <UserRound className="w-5 h-5" />
            </div>
            <div>
              <SheetTitle className="font-headline text-xl">Hikâyedeki Kimliğin</SheetTitle>
              <SheetDescription className="text-xs mt-1">
                Bu kimlik yalnız bu hikâye dalında geçerli. Dynamic Story sistemi seni ancak yaşanan olaylar gerçekten gerektirirse hikâyenin parçası yapar.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="persona-name" className="text-xs font-bold">Tercih ettiğin ad</Label>
            <Input id="persona-name" value={name} onChange={event => setName(event.target.value)} maxLength={80} className="h-12 rounded-2xl bg-muted/30" placeholder="Örn. Kemal" />
            <p className="text-[10px] text-muted-foreground">Bu alan özel persona metadata’sıdır; “Bağlama göre” modunda karakterler bunu kendiliğinden bilmez.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="persona-role" className="text-xs font-bold">Bu evrende tercih ettiğin rol</Label>
            <Input id="persona-role" value={role} onChange={event => setRole(event.target.value)} maxLength={80} className="h-12 rounded-2xl bg-muted/30" placeholder="Örn. Konağa yeni gelen araştırmacı" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="persona-traits" className="text-xs font-bold">Karakter özelliklerin</Label>
            <Input id="persona-traits" value={traits} onChange={event => setTraits(event.target.value)} maxLength={360} className="h-12 rounded-2xl bg-muted/30" placeholder="meraklı, cesur, temkinli" />
            <p className="text-[10px] text-muted-foreground">Virgülle ayır. En fazla 6 özellik kullanılır.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="persona-note" className="text-xs font-bold">Evren notun</Label>
            <textarea
              id="persona-note"
              value={note}
              onChange={event => setNote(event.target.value)}
              maxLength={500}
              rows={4}
              className="w-full resize-none rounded-2xl border border-input bg-muted/30 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              placeholder="Örn. Aslı'ya güveniyorum ama Kerem'den şüpheleniyorum."
            />
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-xs font-black text-foreground">Karakterler kimliğini nasıl öğrenir?</span>
              <p className="text-[10px] text-muted-foreground mt-1">Bu ayar, hesap adının hikâyeye yanlışlıkla sızmasını engeller.</p>
            </div>
            <div className="grid gap-2">
              {identityOptions.map(option => {
                const Icon = option.icon;
                const selected = identityDisclosure === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setIdentityDisclosure(option.id)}
                    className={cn(
                      'rounded-2xl border p-3.5 flex gap-3 text-left transition-all active:scale-[0.99]',
                      selected
                        ? 'border-primary/50 bg-primary/10 shadow-sm shadow-primary/10'
                        : 'border-border/50 bg-muted/20 hover:bg-muted/35'
                    )}
                  >
                    <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', selected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <span className={cn('block text-xs font-black', selected ? 'text-primary' : 'text-foreground')}>{option.title}</span>
                      <span className="block text-[10px] leading-relaxed text-muted-foreground mt-1">{option.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <div>
                <span className="text-xs font-black text-foreground">Paylaşılan hikâyelerde Character Echo</span>
                <p className="text-[10px] text-muted-foreground mt-1">İzin vermedikçe başka kullanıcılar senin AI karakter kopyanla konuşamaz.</p>
              </div>
            </div>
            <div className="grid gap-2">
              {echoOptions.map(option => {
                const selected = echoVisibility === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setEchoVisibility(option.id)}
                    className={cn(
                      'rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.99]',
                      selected
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-border/50 bg-muted/20 hover:bg-muted/35'
                    )}
                  >
                    <span className={cn('block text-xs font-black', selected ? 'text-primary' : 'text-foreground')}>{option.title}</span>
                    <span className="block text-[10px] leading-relaxed text-muted-foreground mt-1">{option.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 flex gap-3">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Bir karakterin hayatını kurtarmak, kritik bir sır vermek veya kararını değiştirmek gibi güçlü etkiler yaratırsan Dynamic Story seni önce “fark edilen”, sonra koşullar uygunsa “tanınan” bir hikâye aktörüne dönüştürebilir. Sadece sohbet etmiş olman yeterli değildir.
            </p>
          </div>

          <Button type="button" onClick={handleSave} disabled={!name.trim() || !role.trim()} className="w-full h-14 rounded-2xl font-black">
            Kimlik ve İzinleri Kaydet
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
