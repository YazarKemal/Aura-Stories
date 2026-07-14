/**
 * Generate Story API — Statik Fallback
 *
 * Statik export (output: 'export') ile uyumludur.
 * Hikaye üretimi şu an sunucu taraflıdır (DeepSeek AI).
 *
 * TODO: Client-side story generation veya ayrı backend endpoint.
 *       Vercel deployment'da bu route'un eski sürümü kullanılabilir.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Generate Story API, statik export modunda devre dışı.',
    note: 'Hikaye üretimi için ayrı bir backend endpoint yapılandırılması gerekir.',
  });
}
