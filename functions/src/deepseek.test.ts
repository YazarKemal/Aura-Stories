/**
 * DeepSeek istemcisi birim testleri.
 *
 * Node.js yerleşik test runner (node:test) ile çalışır.
 * Gerçek ağ isteği yapmaz — globalThis.fetch mock'lanır.
 *
 * Çalıştırma (derlenmiş JS üzerinden):
 *   DEEPSEEK_API_KEY=test-key node --test lib/deepseek.test.js
 *   veya:
 *   npm --prefix functions test
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { callDeepSeek } from './deepseek';
import type { DeepSeekError } from './errors';

// ── Mock helpers ──────────────────────────────────────────────

interface FetchMockCall {
  url: string;
  init: RequestInit;
}

type FetchImpl = (url: string, init: RequestInit) => Promise<Response>;

const originalFetch: typeof globalThis.fetch = globalThis.fetch;
let capturedCalls: FetchMockCall[] = [];

function mockFetch(impl: FetchImpl): void {
  capturedCalls = [];
  const mock = (
    async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr =
        typeof url === 'string'
          ? url
          : url instanceof URL
            ? url.href
            : url.url;
      capturedCalls.push({ url: urlStr, init: init ?? {} });
      return impl(urlStr, init ?? {});
    }
  ) as typeof globalThis.fetch;
  globalThis.fetch = mock;
}

function okResponse(
  content: string,
  overrides: Record<string, unknown> = {}
): Response {
  return new Response(
    JSON.stringify({
      choices: [
        { message: { content }, finish_reason: 'stop' },
      ],
      model: 'deepseek-chat',
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
      ...overrides,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

function errorResponse(
  status: number,
  body?: Record<string, unknown>
): Response {
  return new Response(body ? JSON.stringify(body) : '{}', {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Secret helpers ────────────────────────────────────────────

/**
 * defineSecret('DEEPSEEK_API_KEY') .value() → process.env.DEEPSEEK_API_KEY
 * Test ortamında env var kullanarak secret'ı simüle ederiz.
 */
function setSecret(value: string): void {
  process.env.DEEPSEEK_API_KEY = value;
}

function clearSecret(): void {
  delete process.env.DEEPSEEK_API_KEY;
}

// ── Tests ─────────────────────────────────────────────────────

describe('callDeepSeek', () => {
  beforeEach(() => {
    setSecret('test-sk-dummy-key-for-unit-tests');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearSecret();
  });

  // ── Girdi validasyonu ───────────────────────────────────

  it('boş messages dizisini reddeder', async () => {
    await assert.rejects(
      () => callDeepSeek([]),
      (err: unknown) => {
        if (!(err instanceof Error)) return false;
        return (
          err.name === 'DeepSeekError' &&
          (err as DeepSeekError).code === 'INVALID_INPUT'
        );
      }
    );
  });

  it('user mesajı olmayan diziyi reddeder', async () => {
    await assert.rejects(
      () =>
        callDeepSeek([
          { role: 'system', content: 'Sen bir asistansın.' },
        ]),
      (err: unknown) => {
        if (!(err instanceof Error)) return false;
        return (
          err.name === 'DeepSeekError' &&
          (err as DeepSeekError).code === 'INVALID_INPUT'
        );
      }
    );
  });

  // ── Başarılı response ───────────────────────────────────

  it('başarılı text response döndürür', async () => {
    mockFetch(async () => okResponse('Merhaba, ben Kerem.'));

    const result = await callDeepSeek([
      { role: 'user', content: 'Merhaba' },
    ]);
    assert.equal(result.content, 'Merhaba, ben Kerem.');
    assert.equal(result.model, 'deepseek-chat');
    assert.equal(result.finishReason, 'stop');
    assert.ok(result.usage, 'usage null olmamalı');
    assert.equal(result.usage!.promptTokens, 10);
  });

  it('json_object request body doğru formatı içerir', async () => {
    mockFetch(async () => okResponse('{"key":"value"}'));

    await callDeepSeek(
      [
        {
          role: 'user',
          content: 'JSON olarak döndür: {"key":"value"}',
        },
      ],
      { responseFormat: 'json_object' }
    );
    const body = capturedCalls[0]?.init.body as string;
    assert.ok(body, 'Request body olmalı');
    const parsed = JSON.parse(body);
    assert.deepEqual(parsed.response_format, { type: 'json_object' });
  });

  // ── Hata yanıtları ──────────────────────────────────────

  it('401 hatasında retry yapmaz', async () => {
    let callCount = 0;
    mockFetch(async () => {
      callCount++;
      return errorResponse(401, { error: 'Invalid API key' });
    });

    await assert.rejects(
      () =>
        callDeepSeek([{ role: 'user', content: 'test' }]),
      (err: unknown) => {
        if (!(err instanceof Error)) return false;
        return (
          err.name === 'DeepSeekError' &&
          (err as DeepSeekError).code === 'AUTHENTICATION' &&
          callCount === 1
        );
      }
    );
  });

  it('429 hatasında retry yapar', async () => {
    let callCount = 0;
    mockFetch(async () => {
      callCount++;
      if (callCount === 1) {
        return errorResponse(429, { error: 'Rate limit' });
      }
      return okResponse('Başarılı yanıt');
    });

    const result = await callDeepSeek(
      [{ role: 'user', content: 'test' }],
      { maxRetries: 2 }
    );
    assert.equal(result.content, 'Başarılı yanıt');
    assert.ok(
      callCount === 2,
      `429 retry edilmeliydi, çağrı sayısı: ${callCount}`
    );
  });

  it('timeout kontrollü hata verir', async () => {
    // Sonsuza kadar cevap vermeyen fetch
    mockFetch(async (_url, init) => {
      const signal = init.signal!;
      return new Promise<Response>((_resolve, reject) => {
        const onAbort = () => {
          signal.removeEventListener('abort', onAbort);
          reject(new DOMException('Aborted', 'AbortError'));
        };
        signal.addEventListener('abort', onAbort);
        if (signal.aborted) onAbort();
      });
    });

    await assert.rejects(
      () =>
        callDeepSeek(
          [{ role: 'user', content: 'test' }],
          { timeoutMs: 50, maxRetries: 0 }
        ),
      (err: unknown) => {
        if (!(err instanceof Error)) return false;
        return (
          err.name === 'DeepSeekError' &&
          ((err as DeepSeekError).code === 'TIMEOUT' ||
            (err as DeepSeekError).code === 'UPSTREAM')
        );
      }
    );
  });

  it('geçersiz response shape reddedilir', async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({ foo: 'bar' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await assert.rejects(
      () =>
        callDeepSeek([{ role: 'user', content: 'test' }]),
      (err: unknown) => {
        if (!(err instanceof Error)) return false;
        return (
          err.name === 'DeepSeekError' &&
          (err as DeepSeekError).code === 'INVALID_RESPONSE'
        );
      }
    );
  });

  // ── Güvenlik ────────────────────────────────────────────

  it('hata mesajında secret veya authorization değeri görünmez', async () => {
    mockFetch(async () =>
      errorResponse(401, {
        error: 'Invalid token sk-abc123def456',
      })
    );

    try {
      await callDeepSeek([{ role: 'user', content: 'test' }]);
      assert.fail('Hata fırlatmalıydı');
    } catch (err: unknown) {
      if (err instanceof Error) {
        assert.ok(
          !err.message.includes('sk-abc123'),
          `Hata mesajı API key içermemeli. Mesaj: ${err.message}`
        );
        assert.ok(
          !err.message.includes('test-sk-dummy'),
          `Hata mesajı test secret'ı içermemeli. Mesaj: ${err.message}`
        );
      } else {
        throw err;
      }
    }
  });

  // ── Config hatası ────────────────────────────────────────

  it('secret tanımlı değilse CONFIGURATION hatası verir', async () => {
    clearSecret();

    await assert.rejects(
      () =>
        callDeepSeek([{ role: 'user', content: 'test' }]),
      (err: unknown) => {
        if (!(err instanceof Error)) return false;
        return (
          err.name === 'DeepSeekError' &&
          (err as DeepSeekError).code === 'CONFIGURATION'
        );
      }
    );
  });
});
