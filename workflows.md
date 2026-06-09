# Finera Geliştirme İş Akışları (workflows.md)

Bu dosya, Finera Smart Finance Dashboard projesinde yeni bir özellik ekleme, hata ayıklama (debugging), veritabanı şemasını genişletme ve test süreçlerinin adım adım nasıl yürütüleceğini açıklar.

---

## 1. Yeni Bir Görünüm (View) ve Menü Öğesi Ekleme

Uygulamaya yeni bir ekran/sayfa eklemek için aşağıdaki adımlar takip edilmelidir:

### Adım 1: HTML Yapısının Oluşturulması
[index.html](file:///C:/Users/berfi/OneDrive/Masa%C3%BCst%C3%BC/antig%20final/index.html) dosyası içindeki `#view-container` ID'li div içerisine yeni sayfanın HTML yapısı eklenir. Görünümün varsayılan olarak gizli kalması için `class` listesine `hidden` eklenmelidir:
```html
<!-- index.html -->
<div id="yeni-ekran-view" class="view hidden">
    <div class="card">
        <h2>Yeni Sayfa Başlığı</h2>
        <p>İçerik buraya gelecektir.</p>
    </div>
</div>
```

### Adım 2: Sidebar Menüsüne Buton Eklenmesi
[index.html](file:///C:/Users/berfi/OneDrive/Masa%C3%BCst%C3%BC/antig%20final/index.html) içerisindeki `<nav class="nav-menu">` alanına yeni bir buton eklenir. `data-target` niteliği, yukarıda tanımlanan görünümün `id` değeri ile tam olarak eşleşmelidir:
```html
<button class="nav-item" data-target="yeni-ekran-view">
    <span class="material-icons-round">star</span>
    <span>Yeni Ekran</span>
</button>
```

### Adım 3: JavaScript Yenileme Fonksiyonunun Bağlanması
[app.js](file:///C:/Users/berfi/OneDrive/Masa%C3%BCst%C3%BC/antig%20final/app.js) dosyasındaki sayfa geçiş dinleyicisine (`navItems.forEach`) yeni görünüm hedefi eklenerek tetiklenecek JavaScript fonksiyonu bağlanır:
```javascript
// app.js - navItems.forEach döngüsü içi
} else if (targetId === 'yeni-ekran-view') {
    refreshYeniEkranData();
}
```

---

## 2. Veritabanı Tablosu Ekleme ve Şema Genişletme

Veritabanına yeni bir tablo eklenmek istendiğinde veya şema güncelleneceğinde uygulanacak adımlar:

### Adım 1: seedData Fonksiyonunun Güncellenmesi
[db.js](file:///C:/Users/berfi/OneDrive/Masa%C3%BCst%C3%BC/antig%20final/db.js) içindeki `seedData()` metoduna yeni tablonun başlangıç verileri ve varsayılan boş yapısı eklenir:
```javascript
this.set('yeni_tablo', [
    { id: 1, user_id: 1, veri: 'Örnek Veri' }
]);
```

### Adım 2: Sürüm Sentinel Değerinin Yükseltilmesi
Veritabanının tarayıcı belleğindeki eski sürümü ezmesi ve yeni verilerle baştan başlatılması için `db.js`'deki `init()` fonksiyonu içinde bulunan sentinel anahtarı yükseltilir:
```javascript
// db.js - init() fonksiyonu içi
// Sürüm 5'ten v6'ya yükseltilerek sıfırlama tetiklenir
const initKey = `${DB_PREFIX}initialized_v6`; 
```

---

## 3. Hata Ayıklama (Debugging) İş Akışı

Uygulamada bir hata oluştuğunda veya geliştirme yaparken izlenecek adımlar:

* **Hata Overlay Ekranını İnceleme:** Eğer ekranda kırmızı renkli **Sistem Yükleme Hatası (Diagnostics)** paneli açılırsa, hata mesajı ve Stack Trace bilgisi okunarak hatanın hangi dosyadan (`app.js` veya `db.js`) kaynaklandığı tespit edilir.
* **Önbelleği Temizleme:** Veritabanındaki veri bozulmalarından veya sürüm uyuşmazlıklarından kaynaklanan hatalarda overlay üzerindeki **"Önbelleği Temizle ve Yeniden Yükle"** butonu tıklanarak `localStorage` temizlenir ve uygulama sıfırdan başlatılır.
* **Manuel LocalStorage Kontrolü:** Tarayıcı geliştirici araçları (F12) -> Application -> Local Storage altından `smartfinance_` ön ekli veriler incelenerek şema uyumluluğu kontrol edilir.
