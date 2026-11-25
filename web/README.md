# Vidoo araç ilan videosu

Angular 22 ve TypeScript ile hazırlanan Türkçe web uygulaması, 3–5 araç fotoğrafından 9–15 saniyelik bir ilan videosu oluşturur. Önizleme 360 × 640 ve filigranlıdır. Tek seferlik Stripe Checkout ödemesinden sonra 720 × 1280 H.264 MP4 indirilir. Varsayılan fiyat 4,99 €.

## Çalıştırma

Node.js 22.22.3+ (22.x), 24.15.0+ (24.x) veya 26.x, FFmpeg (`libx264` ve `drawtext` destekli) ve sistem yazı tipi gereklidir.

```sh
cd web
npm ci
npm run build
npm start
```

[localhost:3000](http://localhost:3000) adresini açın. Ödeme aracını denemek için `STRIPE_SECRET_KEY` değişkenini Stripe test anahtarıyla sunucu ortamına ekleyin. Anahtar yoksa yükleme ve önizleme kullanılabilir.

| Değişken | Varsayılan | Açıklama |
| --- | --- | --- |
| `PORT` | `3000` | HTTP portu |
| `VIDOO_BASE_URL` | `http://localhost:3000` | Uygulamanın kullanıcıya görünen adresi. Yayında HTTPS adresi kullanılmalı. |
| `STRIPE_SECRET_KEY` | | Sunucudaki Stripe test veya canlı gizli anahtarı |
| `VIDOO_PRICE_CENTS` | `499` | EUR cinsinden fiyatın sent değeri |
| `VIDOO_DATA_DIR` | `vidoo-data` | Web kökü dışında, kalıcı ve yazılabilir dizin |

İlk sürüm tek sunucu ve kalıcı disk ile çalışır. Üretilen videolar, önizlemenin oluşturulmasından sonra 7 gün erişilebilir. Ödeme başlatma penceresi 1 saattir. Başarılı ödeme sonrası indirme bağlantısına aynı tarayıcıdan veya Stripe’ın yönlendirdiği sayfanın adresiyle geri dönülebilir. Oluşturulan videoların adresleri erişim anahtarı işlevi görür. Sunucu günlüklerinde URL sorgu dizelerini ve video kimliklerini kaydetmeyin. Ters vekilde yükleme boyutu sınırını en az 41 MiB, yanıt zaman aşımını en az 4 dakika olarak ayarlayın.

Yerel entegrasyon testi gerçek FFmpeg çıktısı ve sahte Stripe API yanıtlarıyla çalışır.

```sh
npm test
```

## TypeScript adlandırma

`npm run lint` web kaynaklarını kontrol eder. Sınıf üyelerinde erişim belirteci açıkça yazılır. Template'e ait üyeler `protected`, dışarı kullanılan üyeler `public`, sınıf içi üyeler `private` olur.

- Özel sinyal: `private readonly _$loading = signal(false)`
- Dışarı açılan sinyal: `public readonly $loading = this._$loading.asReadonly()`
- Özel metot: `private _load()`
- Veri henüz yoksa: `signal<Order>()`. Başlangıç durumu belli olan bayraklar, listeler ve metinler sırasıyla `false`, `[]` ve `''` ile başlar.

Uygulamaya ait servis referansları `selectionService` veya `private readonly _selectionService` biçiminde adlandırılır. Veri tipleri `src/models/`, ortak sabitler `src/constants/` altındadır.
