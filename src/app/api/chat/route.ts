/**
 * Chat API — Statik Fallback
 *
 * Statik export (output: 'export') ile uyumlu olması için
 * bu rota statik yanıt döndürür. Gerçek chat işlevselliği
 * client-side'da src/lib/chat-client.ts üzerinden çalışır.
 *
 * Server deployment'da (Vercel vb.) chat-client.ts yerine
 * bu route'un eski sürümü kullanılabilir.
 */

import { NextResponse } from 'next/server';

// ── GET: Statik bilgi yanıtı ──────────────────────────────────

export function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Chat API, statik export modunda client-side çalışır.',
    clientModule: '@/lib/chat-client',
  });
}
