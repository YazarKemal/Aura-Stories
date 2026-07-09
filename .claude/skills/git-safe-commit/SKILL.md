---
name: git-safe-commit
description: Safe git commit workflow for Termux/Android — pre-commit typecheck/lint, shebang-aware hooks, sensitive-file guards. Use before every commit.
---

Termux/Android ortamında güvenli git commit işlemleri. Commit öncesi typecheck ve lint kontrolü, hassas dosya koruması, ve Termux uyumlu git hook kurulumu sağlar. [[android-path-resolver]] ve [[next-clean-builder]] becerileriyle entegre çalışır.

## Driver

`.claude/skills/git-safe-commit/safe-commit.sh` — güvenli commit wrapper.

```bash
# Commit (önce typecheck + lint çalıştırır):
bash .claude/skills/git-safe-commit/safe-commit.sh "feat: yeni özellik eklendi"

# Kontrolleri atlayarak commit:
bash .claude/skills/git-safe-commit/safe-commit.sh "hotfix" --no-verify

# Pre-commit hook kurulumu (bir kere):
bash .claude/skills/git-safe-commit/safe-commit.sh --hook-install

# Repo durumu:
bash .claude/skills/git-safe-commit/safe-commit.sh --status
```

## Commit Akışı

Her commit'te sırasıyla şunlar çalışır:

| Adım | Kontrol | Başarısız Olursa |
|---|---|---|
| 1. TS Typecheck | Staged `.ts`/`.tsx` dosyaları varsa `tsc --noEmit` | **Commit ENGELLENİR** |
| 2. ESLint | Staged `.ts`/`.tsx` dosyaları varsa `next lint` | Uyarı verir, commit devam eder |
| 3. Hassas Dosya | `.tmp/*`, `*.pid`, `.env`, `.env.local` staged mi? | **Commit ENGELLENİR** |

## Pre-commit Hook Kurulumu

```bash
bash .claude/skills/git-safe-commit/safe-commit.sh --hook-install
```

Bu komut `.git/hooks/pre-commit` dosyasını oluşturur. Sonraki tüm `git commit` komutlarında otomatik olarak yukarıdaki kontroller çalışır. Hook başarısız olursa commit iptal edilir.

Hook shebang'i Termux uyumludur: `#!/data/data/com.termux/files/usr/bin/env bash`

## Termux'a Özel Koruma

- **Shebang uyumluluğu**: Hook ve tüm script'ler Termux'un gerçek `env` yolunu kullanır
- **TMPDIR kullanımı**: Geçici PID/log dosyaları `/tmp` yerine `$TMPDIR`'e yazılır
- **Node.js invocation**: `tsc` ve `next` binary'leri `node ./node_modules/...` ile çağrılır (shebang fix uygulanmadıysa bile çalışır)
- **Hassas dosya koruması**: `.env*` ve `.tmp/*` gibi dosyaların yanlışlıkla commit edilmesini engeller

## Manuel Kullanım (Hook Olmadan)

Hook kurulu değilse, her commit'ten önce:

```bash
# Stage:
git add .

# Güvenli commit:
bash .claude/skills/git-safe-commit/safe-commit.sh "açıklama"

# Veya acele durumda:
bash .claude/skills/git-safe-commit/safe-commit.sh "hotfix" --no-verify
```

## Diğer Becerilerle İlişkisi

- [[android-path-resolver]] — shebang ve TMPDIR çözümleri
- [[next-clean-builder]] — typecheck/lint adımları için Next.js invocation stratejisi
- [[run-aura-stories]] — commit öncesi smoke test için kullanılabilir
