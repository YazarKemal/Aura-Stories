'use client';

import { useEffect, useState } from 'react';
import { UserRound, Sparkles } from 'lucide-react';
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
import { saveReaderPersona, type ReaderPersona } from '@/lib/reader-persona';

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

  useEffect(() => {
    if (!open) return;
    setName(persona.name);
    setRole(persona.role);
    setTraits(persona.traits.join(', '));
    setNote(persona.note);
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
    };
    saveReaderPersona(next, storyId);
    onSave(next);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88dvh] rounded-t-[2.5rem] border-white/10 bg-background/95 backdrop-blur-2xl px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-4 overflow-y-auto"
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
                Bu kimlik yalnızca bu hikâye evreninde geçerli. Karakterlerin seni nasıl tanıyacağını ve AI bölümlerinde nasıl yer alacağını belirle.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="persona-name" className="text-xs font-bold">Adın</Label>
            <Input id="persona-name" value={name} onChange={event => setName(event.target.value)} maxLength={80} className="h-12 rounded-2xl bg-muted/30" placeholder="Örn. Kemal" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="persona-role" className="text-xs font-bold">Bu evrendeki rolün</Label>
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
              placeholder="Örn. Zehra'ya güveniyorum ama Demir'den şüpheleniyorum."
            />
          </div>

          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 flex gap-3">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Karakterler adını ve rolünü kullanabilir; AI yeni bölümlerde seni mantıklı olduğunda sahneye dahil eder. Başka bir hikâyede farklı bir kimlik seçebilirsin.
            </p>
          </div>

          <Button type="button" onClick={handleSave} disabled={!name.trim() || !role.trim()} className="w-full h-14 rounded-2xl font-black">
            Bu Kimlikle Devam Et
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
