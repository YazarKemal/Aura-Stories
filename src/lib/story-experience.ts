import type { Story, StoryExperienceConfig } from '@/lib/types';

export interface ResolvedStoryExperience {
  mode: 'classic' | 'dynamic';
  baseChapterCount: number;
  characterRoomEnabled: boolean;
  readerParticipationEnabled: boolean;
  characterEchoEnabled: boolean;
}

const DEFAULT_DYNAMIC_EXPERIENCE: ResolvedStoryExperience = {
  mode: 'dynamic',
  baseChapterCount: 2,
  characterRoomEnabled: true,
  readerParticipationEnabled: true,
  characterEchoEnabled: true,
};

type StoryExperienceSource = Pick<Story, 'experience'> | StoryExperienceConfig | undefined;

function isStoryExperienceHolder(
  value: StoryExperienceSource,
): value is Pick<Story, 'experience'> {
  return typeof value === 'object'
    && value !== null
    && Object.prototype.hasOwnProperty.call(value, 'experience');
}

export function resolveStoryExperience(
  storyOrConfig: StoryExperienceSource,
): ResolvedStoryExperience {
  const config: StoryExperienceConfig | undefined = isStoryExperienceHolder(storyOrConfig)
    ? storyOrConfig.experience
    : storyOrConfig;

  const mode = config?.mode ?? DEFAULT_DYNAMIC_EXPERIENCE.mode;
  const characterRoomEnabled = mode === 'dynamic'
    ? (config?.characterRoomEnabled ?? true)
    : (config?.characterRoomEnabled ?? false);
  const readerParticipationEnabled = characterRoomEnabled
    && mode === 'dynamic'
    && (config?.readerParticipationEnabled ?? true);
  const characterEchoEnabled = readerParticipationEnabled
    && (config?.characterEchoEnabled ?? true);

  return {
    mode,
    baseChapterCount: Math.max(1, Math.min(20, config?.baseChapterCount ?? 2)),
    characterRoomEnabled,
    readerParticipationEnabled,
    characterEchoEnabled,
  };
}
