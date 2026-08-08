import { HttpsError } from 'firebase-functions/v2/https';
import { callDeepSeek } from './deepseek';
import { buildStoryPrompt } from './prompts';
import { evaluateStoryQuality, type StoryQualityReport } from './story-quality';
import { chapterOutputSchema } from './validation';
import type { GenerateStoryInput, GenerateStoryOutput } from './types';

const MODEL = 'deepseek-chat';
const PRIMARY_TEMPERATURE = 0.86;
const EDITOR_TEMPERATURE = 0.55;
const MAX_TOKENS = 1800;

export interface AuraStoryEngineResult {
  output: GenerateStoryOutput;
  raw: string;
  quality: StoryQualityReport;
  rewritten: boolean;
}

function parseOutput(raw: string): GenerateStoryOutput {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new HttpsError('internal', 'AI yanıtı geçerli JSON formatında değil.');
  }

  const result = chapterOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new HttpsError(
      'internal',
      `AI yanıtı geçersiz: ${result.error.issues.map(issue => issue.message).join(', ')}`,
    );
  }
  return result.data;
}

function buildEditorPrompt(
  input: GenerateStoryInput,
  draft: GenerateStoryOutput,
  quality: StoryQualityReport,
): string {
  const issues = quality.issues.length > 0
    ? quality.issues.map((issue, index) => `${index + 1}. ${issue}`).join('\n')
    : 'Genel akış ve seri-kurgu ritmini güçlendir.';

  return `Sen Aura Stories'in kıdemli metin editörüsün. Aşağıdaki taslak teknik kalite kontrolünden düşük puan aldı. Hikâyenin olaylarını ve okuyucu kararının yönünü DEĞİŞTİRMEDEN metni yeniden düzenle.

HİKÂYE: ${input.storyTitle}
BÖLÜM: ${input.chapterNumber}
OKUYUCU KARARI: ${input.chosenFate.text}
TÜR: ${(input.storyTags || []).join(', ') || 'Kurgu'}

DÜZELTİLMESİ GEREKENLER:
${issues}

TASLAK JSON:
${JSON.stringify(draft)}

EDİTÖR KURALLARI:
- 420-620 kelimelik, 5-9 paragraflı mobil seri-kurgu ritmi hedefle.
- Olay sırasını ve temel sonucu koru; yeni büyük lore uydurma.
- Tekrarları, klişeleri, açıklayıcı diyalogları ve yapay şiirselliği azalt.
- Duyguyu davranış ve alt metinle göster.
- Son paragrafı güçlü bir kancaya dönüştür.
- optionA ve optionB birbirinden net biçimde farklı birer eylem ve bedel vaat etsin.
- Başlık kısa ve sahneye özgü olsun.

SADECE geçerli JSON nesnesi döndür. Markdown veya açıklama ekleme:
{"title":"...","content":"...","optionA":"...","optionB":"..."}`;
}

export async function generateAuraStory(
  input: GenerateStoryInput,
  timeoutMs: number,
): Promise<AuraStoryEngineResult> {
  const primary = await callDeepSeek(
    [{ role: 'system', content: buildStoryPrompt(input) }],
    {
      model: MODEL,
      temperature: PRIMARY_TEMPERATURE,
      maxTokens: MAX_TOKENS,
      responseFormat: 'json_object',
      timeoutMs,
      maxRetries: 1,
    },
  );

  const draft = parseOutput(primary.content);
  const initialQuality = evaluateStoryQuality(draft);

  if (!initialQuality.shouldRewrite) {
    return {
      output: draft,
      raw: primary.content,
      quality: initialQuality,
      rewritten: false,
    };
  }

  // Düşük kaliteli taslaklarda ikinci çağrı yalnızca editör görevi görür.
  // İlk çağrı olay örgüsünü kurar; ikinci çağrı dili ve mobil ritmi düzeltir.
  const editor = await callDeepSeek(
    [{ role: 'system', content: buildEditorPrompt(input, draft, initialQuality) }],
    {
      model: MODEL,
      temperature: EDITOR_TEMPERATURE,
      maxTokens: MAX_TOKENS,
      responseFormat: 'json_object',
      timeoutMs,
      maxRetries: 0,
    },
  );

  const polished = parseOutput(editor.content);
  const polishedQuality = evaluateStoryQuality(polished);

  // Editör sonucu teknik olarak daha kötü olduysa güvenli biçimde ilk taslağı koru.
  if (polishedQuality.score < initialQuality.score) {
    return {
      output: draft,
      raw: primary.content,
      quality: initialQuality,
      rewritten: false,
    };
  }

  return {
    output: polished,
    raw: editor.content,
    quality: polishedQuality,
    rewritten: true,
  };
}
