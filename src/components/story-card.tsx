
import Image from 'next/image';
import { Story } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';

interface StoryCardProps {
  story: Story;
  variant?: 'popular' | 'recommended';
}

export function StoryCard({ story, variant = 'popular' }: StoryCardProps) {
  if (variant === 'popular') {
    return (
      <div className="flex flex-col gap-2 min-w-[130px] group cursor-pointer">
        <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105">
          <Image
            src={story.imageUrl}
            alt={story.title}
            fill
            className="object-cover"
            data-ai-hint="book cover"
          />
        </div>
        <div className="flex flex-col">
          <h4 className="font-headline text-sm font-semibold truncate leading-tight">{story.title}</h4>
          <p className="text-xs text-muted-foreground truncate">{story.author}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 p-3 rounded-2xl glass-morphism shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
      <div className="relative flex-shrink-0 aspect-[2/3] w-24 rounded-lg overflow-hidden shadow-md group-hover:scale-105 transition-transform">
        <Image
          src={story.imageUrl}
          alt={story.title}
          fill
          className="object-cover"
          data-ai-hint="book cover"
        />
      </div>
      <div className="flex flex-col justify-between py-1 flex-1 min-w-0">
        <div>
          <h4 className="font-headline text-lg font-bold leading-tight truncate text-accent">{story.title}</h4>
          <p className="text-xs text-muted-foreground mb-2">{story.author}</p>
          <p className="text-sm text-foreground/80 line-clamp-2 leading-snug">
            {story.synopsis}
          </p>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Eye className="w-3.5 h-3.5 text-primary" />
            <span>{(story.readCount / 1000).toFixed(1)}k okuma</span>
          </div>
          <Badge variant="secondary" className="text-[10px] py-0 h-5 px-2 bg-secondary/50 text-accent">
            {story.category}
          </Badge>
        </div>
      </div>
    </div>
  );
}
