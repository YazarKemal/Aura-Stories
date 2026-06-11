
'use server';
/**
 * @fileOverview A Genkit flow for generating personalized story recommendations.
 *
 * - personalizeStoryRecommendations - A function that handles the personalized story recommendations process.
 * - PersonalizedStoryRecommendationsInput - The input type for the personalizeStoryRecommendations function.
 * - PersonalizedStoryRecommendationsOutput - The return type for the personalizeStoryRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedStoryRecommendationsInputSchema = z.object({
  readingHistory: z
    .array(z.string())
    .describe('A list of titles or unique identifiers of stories the user has read.'),
  preferences: z
    .string()
    .describe(
      'A descriptive string of user preferences (e.g., "I like romantic comedies and historical dramas", "Prefer fantasy with strong female leads").'
    ),
});
export type PersonalizedStoryRecommendationsInput = z.infer<
  typeof PersonalizedStoryRecommendationsInputSchema
>;

const StoryRecommendationSchema = z.object({
  title: z.string().describe('The title of the recommended story (in Turkish).'),
  author: z.string().describe('The author of the recommended story (in Turkish).'),
  synopsis: z
    .string()
    .describe('A short, two-line synopsis of the story (in Turkish).'),
  imageUrl: z
    .string()
    .url()
    .describe(
      'A placeholder aesthetic image URL suitable for a book cover from Unsplash or a similar service.'
    ),
  readCount: z.number().describe('The number of times the story has been read.'),
});

const PersonalizedStoryRecommendationsOutputSchema = z.object({
  recommendations: z
    .array(StoryRecommendationSchema)
    .describe('A list of personalized story recommendations.'),
});
export type PersonalizedStoryRecommendationsOutput = z.infer<
  typeof PersonalizedStoryRecommendationsOutputSchema
>;

export async function personalizeStoryRecommendations(
  input: PersonalizedStoryRecommendationsInput
): Promise<PersonalizedStoryRecommendationsOutput> {
  return personalizedStoryRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedStoryRecommendationsPrompt',
  input: {schema: PersonalizedStoryRecommendationsInputSchema},
  output: {schema: PersonalizedStoryRecommendationsOutputSchema},
  prompt: `You are an expert literary recommender for a story and novel reading platform named "Aura Stories".
Your task is to provide personalized story recommendations based on the user's reading history and stated preferences.

Generate 3 story recommendations. Each recommendation must include a Turkish title, a Turkish author name, a short two-line Turkish synopsis, a placeholder aesthetic image URL (e.g., from Unsplash, make sure it's a valid URL), and a realistic read count. Ensure the image URL is a direct link to an image.

Keep the synopsis to exactly two lines.

User's Reading History:
{{#each readingHistory}}- {{{this}}}
{{/each}}

User's Preferences: {{{preferences}}}`,
});

const personalizedStoryRecommendationsFlow = ai.defineFlow(
  {
    name: 'personalizedStoryRecommendationsFlow',
    inputSchema: PersonalizedStoryRecommendationsInputSchema,
    outputSchema: PersonalizedStoryRecommendationsOutputSchema,
  },
  async input => {
    let attempts = 0;
    const maxAttempts = 3;
    let lastError;

    while (attempts < maxAttempts) {
      try {
        const {output} = await prompt(input);
        if (!output) {
          throw new Error('Failed to get story recommendations from prompt.');
        }
        return output;
      } catch (error: any) {
        lastError = error;
        attempts++;
        
        const isQuotaError = error.message?.includes('429') || error.message?.includes('quota');
        const isServiceError = error.message?.includes('503') || error.message?.includes('unavailable');

        if (attempts < maxAttempts && (isQuotaError || isServiceError)) {
          // Longer backoff for quota errors
          const delay = isQuotaError ? attempts * 2000 : attempts * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // If it's not a retryable error or we're out of attempts, stop
          break;
        }
      }
    }
    
    // Log the error for internal tracking but let the caller decide how to handle failure
    console.warn('AI Recommendations flow failed. Attempts:', attempts, 'Error:', lastError?.message);
    throw lastError || new Error('Failed to generate recommendations.');
  }
);
