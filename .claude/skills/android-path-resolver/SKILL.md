---
name: android-path-resolver
description: Resolve Termux/Android path incompatibilities — shebang fixes, env location, /tmp alternative, known-broken commands. Foundation skill used by all other project skills on this platform.
---

Android/Termux ortamında standart Linux yolları ile gerçek dosya sistemi arasındaki uyumsuzlukları çözer. Bu beceri, projedeki diğer tüm becerilerin temelini oluşturur — `run-aura-stories`, `next-clean-builder`, ve `git-safe-commit` bu dokümana dayanır.

## Driver

`.claude/skills/android-path-resolver/fix-shebangs.sh` — `node_modules/.bin` içindeki tüm shebang'leri Termux uyumlu hale getirir.

```bash
bash .claude/skills/android-path-resolver/fix-shebangs.sh
```

## Path Map (Android/Termux Gerçekleri)

| Standart Linux | Termux Gerçeği | Etki |
|---|---|---|
| `/usr/bin/env` | `/data/data/com.termux/files/usr/bin/env` | Tüm `#!/usr/bin/env node` shebang'leri kırık |
| `/tmp` | **Yazılamaz** (sandbox) | PID/dosya yazma hataları |
| `/bin/bash` | `/data/data/com.termux/files/usr/bin/bash` | Shebang'ler `#!/bin/bash` yerine doğrudan yolu kullanmalı |
| `$TMPDIR` | `/data/data/com.termux/files/usr/tmp` | Geçici dosyalar için **tek** yazılabilir ortak alan |
| `$HOME` | `/data/data/com.termux/files/home` | Kullanıcı ev dizini |
| `$PREFIX` | `/data/data/com.termux/files/usr` | Termux kurulum kökü |

## Shebang Çözümleri (En İyiden En Kötüye)

### 1. `termux-fix-shebang` (KALICI ÇÖZÜM)

```bash
termux-fix-shebang node_modules/.bin/*
```

Bu komut, tüm binary'lerin shebang satırını Termux'un gerçek `env` konumuna yeniden yazar. `npm install` sonrası bir kere çalıştırmak yeterlidir — sonraki tüm `npx` ve `./node_modules/.bin/*` çağrıları sorunsuz çalışır.

### 2. `node` ile doğrudan çağrı (GEÇİCİ ÇÖZÜM)

```bash
node ./node_modules/next/dist/bin/next dev -p 9002
```

Shebang'i atlayıp doğrudan Node.js ile çalıştırır. `termux-fix-shebang` uygulanamadığında kullanılır.

### 3. `env` bypass (ACİL DURUM)

```bash
/data/data/com.termux/files/usr/bin/env node ./node_modules/.bin/next dev -p 9002
```

## `/tmp` Alternatifi

```bash
# ASLA bunu yapma:
echo "data" > /tmp/file.txt     # Permission denied

# BUNU yap:
echo "data" > "$TMPDIR/file.txt"

# Veya proje-içi fallback:
TMPDIR="${TMPDIR:-$PWD/.tmp}"
mkdir -p "$TMPDIR"
```

## Bozuk Komutlar (Bu Ortamda)

Termux'un glibc uyumluluk katmanından kaynaklanan shared library hataları nedeniyle aşağıdaki komutlar **çalışmaz**:

| Komut | Hata | Alternatif |
|---|---|---|
| `grep` | `error while loading shared libraries: -G` | `node -e "require('fs').readFileSync('/dev/stdin','utf8').match(/pattern/)"` veya built-in bash pattern matching |
| `ps aux` | `error while loading shared libraries` | `ls /proc/*/cmdline 2>/dev/null` ile proses taraması |
| `ss` | `error while loading shared libraries: -G` | `cat /proc/net/tcp` ile port kontrolü |
| `find` | `error while loading shared libraries: -S` | `ls -R` veya Node.js `fs.readdirSync` rekürsif |
| `file` | `command not found` | Shebang kontrolü için `head -1 <file>` |
| `which` | `command not found` | `command -v <binary>` |
| `lsof` | `command not found` | Port kontrolü için `curl -s localhost:<port>` veya `/proc/net/tcp` |
| `fuser` | `command not found` | Proses bulma için `/proc` taranması |

## Hızlı Referans: Sağlam Shebang

Termux'ta çalışacak bir script yazarken:

```bash
#!/data/data/com.termux/files/usr/bin/env bash
# DEĞİL: #!/bin/bash
# DEĞİL: #!/usr/bin/env bash
```

## Diğer Becerilerle Entegrasyon

- [[run-aura-stories]] — bu becerideki shebang ve `/tmp` çözümlerini kullanır
- [[next-clean-builder]] — shebang fix'i build öncesi otomatik uygular
- [[git-safe-commit]] — hook script'leri için doğru shebang ve TMPDIR kullanır
