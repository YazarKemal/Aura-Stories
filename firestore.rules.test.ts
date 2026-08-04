/**
 * Firestore Rules Emulator Testleri
 *
 * Bu testler Firebase Emulator Suite gerektirir:
 *   firebase emulators:start --only firestore
 *   npm test
 *
 * @firebase/rules-unit-testing ile çalışır.
 * CI'da çalıştırmak için .github/workflows içinde emulator step eklenmeli.
 *
 * NOT: Bu dosya yalnızca referans/test planı olarak commit edilmiştir.
 * Çalıştırmak için @firebase/rules-unit-testing paketi gerekir.
 */

/*
Test planı — her senaryo uygulandığında kontrol edilecek:

describe('users/{uid} — create', () => {
  it('geçerli ilk kayıt başarılı')
  it('credits != 200 ile kayıt başarısız')
  it('role != "user" ile kayıt başarısız')
  it('vipUntil != null ile kayıt başarısız')
});

describe('users/{uid} — update', () => {
  it('kendi name güncellenebilir')
  it('kendi credits değiştirilemez')
  it('kendi role admin yapılamaz')
  it('kendi vipUntil değiştirilemez')
  it('başka kullanıcı profili güncellenemez')
  it('başka kullanıcı profili okunamaz')
});

describe('users/{uid}/rateLimits', () => {
  it('kullanıcı rate limit belgesi yazamaz')
  it('kullanıcı rate limit belgesi okuyamaz')
});

describe('contentReports', () => {
  it('geçerli rapor başarılı')
  it('sahte uid ile rapor başarısız')
  it('ekstra alan ile rapor başarısız')
  it('istemci rapor okuyamaz')
});

describe('admin (custom claims)', () => {
  it('admin stories yazabilir')
  it('normal kullanıcı stories yazamaz')
  it('admin contentReports okuyabilir')
});

describe('subcollections', () => {
  it('progress — owner yazabilir')
  it('progress — non-owner yazamaz')
  it('chats — owner yazabilir')
  it('journal — owner yazabilir, alan validasyonu geçerli')
});

describe('transactions (ledger)', () => {
  it('istemci transaction yazamaz')
  it('istemci transaction okuyamaz')
});
*/
