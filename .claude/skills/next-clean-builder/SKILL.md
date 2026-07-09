---
name: next-clean-builder
description: Build, typecheck, lint, and dev-server the Next.js app on Termux/ARM. Handles Turbopack WASM fallback, shebang fixes, and slow ARM compilation automatically.
---

Next.js 15.5.9 projesini Termux/ARM ortamında hatasız şekilde build eder, typecheck yapar ve dev server başlatır. [[android-path-resolver]] becerisindeki shebang çözümlerini otomatik uygular.

## Driver

`.claude/skills/next-clean-builder/build.sh` — tam build döngüsü.

```bash
bash .claude/skills/next-clean-builder/build.sh          # full: typecheck + lint + dev server
bash .claude/skills/next-clean-builder/build.sh dev      # sadece dev server (9002)
bash .claude/skills/next-clean-builder/build.sh dev 3000 # dev server (özel port)
bash .claude/skills/next-clean-builder/build.sh check    # sadece typecheck + lint
bash .claude/skills/next-clean-builder/build.sh build    # production build
```

## Ne Yapar?

1. **Shebang fix** — `termux-fix-shebang` ile `node_modules/.bin` içindeki tüm binary'leri Termux uyumlu yapar
2. **Bağımlılık kontrolü** — `node_modules` yoksa veya bozuksa `npm install` çalıştırır, sonra shebang fix uygular
3. **Dev server** — Next.js'i **Turbopack olmadan** başlatır (ARM WASM sınırlaması)
4. **Typecheck** — `tsc --noEmit` ile tip kontrolü
5. **Lint** — `next lint` ile ESLint kontrolü
6. **Production build** — `NODE_ENV=production next build`

## Next.js Invocation Stratejisi

Script, shebang fix'in başarılı olup olmadığını otomatik algılar:

```bash
# Shebang fix uygulandıysa → doğrudan binary:
./node_modules/.bin/next dev -p 9002

# Shebang fix yoksa → node ile:
node ./node_modules/next/dist/bin/next dev -p 9002
```

## ARM/Android Bilinen Sınırlamalar

| Sınırlama | BUILD.sh Davranışı |
|---|---|
| `--turbopack` çalışmaz (WASM `turbo.createProject` yok) | **Otomatik devre dışı** — hiçbir zaman Turbopack bayrağı eklenmez |
| Native SWC bindings yok | WASM fallback kullanılır (Next.js otomatik yapar) |
| İlk derleme ~40s (ARM) | 90s timeout ile bekleme |
| `sharp` native modülü kurulamayabilir | `npm install --ignore-scripts` gerekebilir, build script'i uyarır |

## Diğer Becerilerle İlişkisi

- [[android-path-resolver]] — shebang fix ve TMPDIR kullanımı bu beceriden gelir
- [[run-aura-stories]] — smoke test için bu becerinin dev server'ını kullanır
- [[git-safe-commit]] — pre-commit hook'unda typecheck/lint için bu beceriyi çağırır
