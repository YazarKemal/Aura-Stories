'use client';

import { useState } from 'react';
import { BookOpen, Coins, PenTool, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OnboardingViewProps {
  onComplete: () => void;
}

export function OnboardingView({ onComplete }: OnboardingViewProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Sınırsız Kurgu Evreni",
      description: "Binlerce sürükleyici hikaye ve roman dünyasına ilk adımınızı atın. En popüler türler burada.",
      icon: BookOpen,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      title: "Okudukça Kazan",
      description: "Okuma hedeflerine ulaşın, Aura Jetonları kazanın ve yeni bölümlerin kilidini hemen açın.",
      icon: Coins,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
    {
      title: "Hikayeni Paylaş",
      description: "Kendi dünyanı kur, Aura Stories yazarı ol ve milyonlarca okuyucuya eserlerini ulaştır.",
      icon: PenTool,
      color: "text-primary",
      bg: "bg-primary/10",
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[900] bg-background flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
      {/* Background Orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 blur-[100px] rounded-full" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-accent/10 blur-[100px] rounded-full" />

      <div className="w-full max-w-sm flex flex-col items-center gap-12 relative z-10">
        {/* Card Content */}
        <div key={currentStep} className="w-full glass-morphism rounded-[3rem] p-10 flex flex-col items-center text-center gap-8 shadow-2xl border-white/10 animate-in slide-in-from-right-10 fade-in duration-500">
          <div className={cn("w-24 h-24 rounded-3xl flex items-center justify-center transition-all shadow-inner", steps[currentStep].bg)}>
            {(() => {
              const Icon = steps[currentStep].icon;
              return <Icon className={cn("w-12 h-12", steps[currentStep].color)} />;
            })()}
          </div>
          
          <div className="space-y-4">
            <h2 className="text-3xl font-headline font-black text-accent leading-tight">
              {steps[currentStep].title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed px-2 font-medium">
              {steps[currentStep].description}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col items-center w-full gap-8">
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  currentStep === i ? "w-8 bg-primary" : "w-2 bg-muted"
                )} 
              />
            ))}
          </div>

          <Button 
            onClick={handleNext}
            className="w-full h-16 rounded-[2rem] bg-gradient-to-r from-primary via-accent to-primary text-white font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all group"
          >
            {currentStep === steps.length - 1 ? "Hemen Başla" : "Devam Et"}
            <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}
