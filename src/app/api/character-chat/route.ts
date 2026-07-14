/**
 * Character Chat API — Statik Fallback
 *
 * Statik export (output: 'export') ile uyumludur.
 * Gerçek sohbet işlevselliği client-side'da
 * src/lib/chat-client.ts üzerinden çalışır.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Character Chat API, statik export modunda client-side çalışır.',
    clientModule: '@/lib/chat-client',
  });
}
