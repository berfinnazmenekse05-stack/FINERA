# Finera Kod Tabanı Yetenekleri (skills.md)

Bu dosya, Finera uygulamasının sahip olduğu teknik yetenekleri, hesaplama algoritmalarını ve veri işleme kabiliyetlerini detaylandırır. Geliştirici veya aracı yapay zeka (agent) bu yetenekleri kullanarak uygulamaya yeni özellikler ekleyebilir veya mevcut olanları optimize edebilir.

---

## 1. Veri Yönetimi ve CRUD Yetenekleri

Uygulama, [db.js](file:///C:/Users/berfi/OneDrive/Masa%C3%BCst%C3%BC/antig%20final/db.js) dosyasındaki `Database` sınıfı aracılığıyla istemci tarafında veri yönetimi gerçekleştirir:
* **LocalStorage Senkronizasyonu:** Tüm tablolar (`users`, `transactions`, `debts`, `subscriptions`, `interventions`, `gps_goals`, `ai_decisions`) tarayıcının `localStorage` alanında `smartfinance_` ön ekiyle saklanır.
* **Bellek İçi (In-Memory) Yedek Mekanizması:** Tarayıcıda `localStorage` erişiminin engellendiği veya gizli sekme modlarında hata oluştuğu durumlarda sistem otomatik olarak verileri RAM üzerinde (`this.memoryStore`) tutacak şekilde yedek mekanizmaya geçiş yapar.
* **Hazır Demo Kullanıcıları (Seeding):** Veritabanı ilk kez başlatıldığında veya sıfırlandığında üç farklı finansal profile (Bireysel - Demo, KOBİ - Tech Solutions, Kurumsal - Global Logistics) ait işlemler otomatik olarak oluşturulur.

---

## 2. Finansal Hesaplamalar ve Simülasyon Yetenekleri

Uygulama içinde gerçekleştirilen özel matematiksel ve finansal işlemler şunlardır:
* **Döviz Çevrimi ve Formatlama:** TRY, USD, EUR ve GBP para birimleri arasında tanımlı sabit kurlar üzerinden anlık dönüşümler (örn. `convertToUSD`, `convertToTRY`) yapılır. Her döviz türü kendi ülkesinin standart formatına göre yerelleştirilerek (`Intl.NumberFormat`) yazdırılır.
* **Yıllık Maliyet Oranı Hesaplama:** Kredi tekliflerinde, aylık taksit tutarı, vade süresi ve tahsis ücreti parametrelerini kullanarak sayısel bisection (ikiye bölme) yöntemiyle yıllık efektif maliyet oranını (`calculateAnnualCostRate`) hesaplar.
* **Direnç Skoru (Resilience Score):** Kullanıcının gelir ve gider verilerini oranlayarak finansal dayanıklılığını 100 üzerinden bir puanla (`val-score`) değerlendirir.
* **Nakit Akışı Tahmini (Cash Flow Forecast):** 90 günlük süre içinde gelir-gider trendlerini analiz ederek gelecekteki bakiye durumunu projeksiyon grafiğiyle gösterir.
* **Dinamik Ne-Olursa-Ne-Olur (What-If) Simülasyonu:** Nakit akışı tahmini ekranında kullanıcının gireceği varsayımsal kredi veya ek gider tutarlarını anında grafiğe yansıtarak finansal yörünge değişimlerini simüle eder.
* **Günlük Tüketim Oranı (Burn Rate):** Mevcut gider hızına göre kullanıcının elindeki nakit birikiminin kaç gün yeteceğini hesaplar (`val-burn-rate`) ve kritik gün sayısının altına inildiğinde kullanıcıyı uyarır.

---

## 3. Veri Görselleştirme (Chart.js) Yetenekleri

* **Çoklu Grafik Desteği:** 90 Günlük Nakit Akışı Projeksiyonu (Çizgi Grafik), Harcama Trendleri (Çizgi Grafik), Kategori Dağılımı (Pasta Grafik), Likidite Oranı (Gösterge/Gauge), Risk Skoru Geçmişi (Çizgi Grafik) ve Portföy Risk Göstergesi (Halka Grafik).
* **Sparklines (Mini Grafik) Çizimi:** Piyasa analizi ekranında döviz ve emtia fiyatlarındaki dalgalanmaları göstermek için performans dostu mini çizgi grafikler oluşturabilir.

---

## 4. Akıllı Erken Uyarı ve Karar Destek Yetenekleri

* **Harcama İvmesi (Velocity) Analizi:** Mevcut ayın harcama toplamını önceki aylar ile karşılaştırarak %20 ve üzeri ani harcama artışlarını tespit eder ve anomali uyarısı üretir.
* **Öneri Motoru (Next Best Action - NBA):** Kullanıcının borç/gelir oranı ve serbest nakit durumuna göre "Kredi Konsolidasyonu", "Altın Hesabı Transferi" veya "Hayat Sigortası" gibi kişiselleştirilmiş finansal stratejiler önerir.
