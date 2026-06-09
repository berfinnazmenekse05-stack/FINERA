# Finera Geliştirici Kuralları (rules.md)

Bu dosya, Finera Smart Finance Dashboard projesinde kod yazarken, tasarım yaparken ve sistemi genişletirken uyulması gereken temel standartları, mimari prensipleri ve tasarım kurallarını içerir.

---

## 1. Mimari ve Kod Standartları

* **Vanilla Javascript ve HTML5:** Uygulama, saf Javascript (ES6+) ve HTML5 mimarisine dayanmaktadır. React, Vue veya jQuery gibi harici bir kütüphane/framework kullanılmamalıdır.
* **Katmanlı Dosya Düzeni:** 
  * Veri erişimi, oturum yönetimi ve CRUD işlemleri sadece [db.js](file:///C:/Users/berfi/OneDrive/Masa%C3%BCst%C3%BC/antig%20final/db.js) dosyasında yer almalıdır.
  * DOM etkileşimleri, sayfa geçişleri, olay dinleyicileri (event listeners) ve grafik çizimleri sadece [app.js](file:///C:/Users/berfi/OneDrive/Masa%C3%BCst%C3%BC/antig%20final/app.js) dosyasında yönetilmelidir.
* **Güvenli Grafik Yönetimi:** Grafik oluştururken her zaman [app.js](file:///C:/Users/berfi/OneDrive/Masa%C3%BCst%C3%BC/antig%20final/app.js) içerisindeki `safeNewChart` fonksiyonu kullanılmalıdır. Bu sayede `Chart.js` kütüphanesinin yüklenemediği veya hata verdiği durumlarda uygulamanın çökmesi engellenir.
* **Kod Yorumları ve Belgelendirme:** Mevcut kod yapısındaki yorum satırları korunmalı ve yeni eklenen karmaşık mantıklar açıklayıcı yorumlarla desteklenmelidir.

---

## 2. Tasarım Sistemi ve Görsel Kurallar (UI/UX)

* **Sleek Dark Mode Arayüzü:** Finera, koyu tonlarda modern bir arayüz tasarımına sahiptir. Renk paletinde düz ve sıradan renkler yerine yumuşak geçişli gradyanlar (gradient) ve neon vurgu tonları (mor, mavi, zümrüt yeşili, kırmızı) kullanılmalıdır:
  * Arka Plan: Koyu lacivert/siyah tonları (`--card-bg`, `--main-bg`).
  * Vurgular: Mor (`#8b5cf6`), Mavi (`#3b82f6`), Zümrüt Yeşili (`#10b981`), Kırmızı (`#ef4444`).
* **Hover ve Mikro Animasyonlar:** Etkileşime açık tüm butonlar, kartlar ve liste öğeleri üzerine gelindiğinde (hover) yumuşak geçiş efektlerine ve mikro animasyonlara sahip olmalıdır.
* **Yer Tutucu (Placeholder) Görseller Kullanmama:** Arayüzde boş görsel alanlar bırakılmamalı; grafikler, ikonlar veya üretilen dinamik görsel varlıklar kullanılmalıdır.
* **Tipografi:** Yazı tiplerinde tarayıcı varsayılanları yerine modern ve okunaklı `Inter` font ailesi tercih edilmelidir. İkonlar için `Material Icons Round` kütüphanesi kullanılmalıdır.

---

## 3. Hata Yönetimi ve Tanı Overlay Mekanizması

* **Global Hata Yakalama:** [index.html](file:///C:/Users/berfi/OneDrive/Masa%C3%BCst%C3%BC/antig%20final/index.html) üzerinde tanımlı olan `window.onerror` ve `unhandledrejection` dinleyicileri kesinlikle kaldırılmamalıdır.
* **Hata Overlay Ekranı:** Uygulama veya veritabanı dosyalarında (`db.js`, `app.js`) kritik bir hata oluştuğunda, `#global-error-overlay` isimli tanı ekranı otomatik olarak tetiklenerek hatanın yerini ve stack trace bilgisini göstermelidir. Bu sistem geliştirme aşamasındaki hataları tespit etmek için kritiktir.

---

## 4. SEO ve Erişilebilirlik (Accessibility)

* **Semantik HTML:** Yapı oluştururken `div` kalabalığından kaçınılmalı, `aside`, `main`, `header`, `section`, `table`, `thead`, `tbody` gibi semantik HTML5 etiketleri kullanılmalıdır.
* **Tekil (Unique) ID Kullanımı:** Form elemanları, butonlar ve dinamik olarak eklenen ana etkileşim bileşenleri, tarayıcı testlerinin ve otomasyon araçlarının tanıyabilmesi için benzersiz `id` değerlerine sahip olmalıdır.
* **Açıklayıcı Meta Etiketleri:** [index.html](file:///C:/Users/berfi/OneDrive/Masa%C3%BCst%C3%BC/antig%20final/index.html) başlığı (`<title>`) ve meta açıklamaları (`<meta name="description">`) uygulamanın finansal asistan kimliğini yansıtacak şekilde optimize edilmelidir.
