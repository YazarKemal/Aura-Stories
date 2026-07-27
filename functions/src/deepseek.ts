import type { ChatMessage } from './types';
import { deepseekApiKey } from './config';

/**
 * DeepSeek API istemcisi — HENÜZ YAPILANDIRILMADI.
 *
 * Bu fonksiyon A2 (Secret Manager) ve A3 (characterChat endpoint)
 * paketlerinde etkinleştirilecektir. Şu aşamada yalnızca kontrollü
 * bir hata döndürür — gerçek API çağrısı yapmaz.
 *
 * Gelecek arayüz:
 * - systemPrompt: karakter kişiliği ve hikâye bağlamı
 * - messages: kullanıcı-karakter diyalog geçmişi
 * - options: sıcaklık, max token, timeout, retry sayısı
 */
export async function callDeepSeek(
  _systemPrompt: string,
  _messages: ChatMessage[],
  _options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  // Secret erişilebilirliğini doğrula (değeri loglama)
  void deepseekApiKey;

  throw new Error(
    'DeepSeek API istemcisi henüz yapılandırılmadı. ' +
    'A2 paketinde etkinleştirilecektir.'
  );
}
