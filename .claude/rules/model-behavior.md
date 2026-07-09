# Model Davranış Kuralları (DeepSeek V4 Pro)

- Halüsinasyon oranı yüksek: API/kütüphane versiyon, config değeri gibi "kesin bilgi" gerektiren konularda emin olmadığın şeyi uydurma, önce doğrula veya belirsizliği söyle
- Kritik değişiklik (Firebase Functions, auth, ödeme/kredi mantığı) sonrası "çalışıyor" deme öncesi mutlaka test/log ile doğrula
- Basit iterasyon → Flash modeli, mimari karar/çok adımlı agentic iş → Pro modeli
- Kod değişikliği öncesi diff'i göster, onay bekle — özellikle sync/credits mantığı gibi kritik dosyalarda
