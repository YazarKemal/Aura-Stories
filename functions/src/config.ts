import { defineSecret } from 'firebase-functions/params';

/**
 * DeepSeek API anahtarı — Secret Manager'da saklanır.
 * Deploy öncesi Firebase CLI ile tanımlanmalıdır:
 *   firebase functions:secrets:set DEEPSEEK_API_KEY
 *
 * Bu dosyada gerçek anahtar değeri bulunmaz.
 */
export const deepseekApiKey = defineSecret('DEEPSEEK_API_KEY');
