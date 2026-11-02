# Flip PDF link ve sayfa kıvrımı düzeltme raporu

## 1. FlipBuilder çıktı yapısı

- Ana giriş: `index.html`
- Kitap ayarları ve eski annotation verisi: `mobile/javascript/config.js`
- Flip/zoom/navigasyon motoru: `mobile/javascript/main.js`
- Sayfa görselleri: `files/mobile/1.jpg`–`files/mobile/264.jpg`
- Küçük önizlemeler: `files/thumb/`
- Erişilebilir temel HTML kopyası: `files/basic-html/`

FlipBuilder sayfaları çalışma anında oluşturuyor. Sayfa resmi ve ek katmanlar, `pageN` kimlikli sayfa elemanının içindeki `.side-content` kapsayıcısında birlikte dönüştürülüyor.

## 2. Link neden kayboluyordu?

Kaynak PDF'deki URI annotation'ları FlipBuilder çıktısına aktarılmamıştı. `pageEditor` içinde yalnızca ilk sayfaya bağlı, yüksekliği negatif ve URL'si yarım kalmış eski bir annotation bulunuyordu. Şirvanşahlar Sarayı bağlantısı Flip'in kendi verisinde yoktu; bu nedenle sayfa görseli görünmesine rağmen QR alanı tıklanabilir değildi.

## 3. Hedef URL çıktı içinde var mıydı?

İlk incelemede aşağıdaki tam URL mevcut Flip çıktısında yoktu:

`https://cdn.eba.gov.tr/temel-egitim/materyaller/hakan-ve-bilgenin-turk-dunyasi-yolculugu/sirvansahlar-sarayi/`

Bu yüzden mevcut bozuk annotation'ı çoğaltmak yerine, PDF annotation'larından üretilen bağımsız ve responsive HTML link katmanı kullanıldı.

## 4. Değiştirilen dosyalar

- `index.html`: özel CSS/JS dosyaları eklendi.
- `mobile/javascript/config.js`: otomatik üst/alt köşe kıvrımı kapatıldı (`bookConfig.CurlingPageCorner=false`).

FlipBuilder'ın minify edilmiş `mobile/javascript/main.js` motoru değiştirilmedi. Sayfa görselleri yeniden encode edilmedi veya rasterize edilmedi.

## 5. Eklenen dosyalar

- `custom/flip-link-fix.css`: görünmez, sayfaya bağlı link alanı.
- `custom/flip-link-fix.js`: dinamik sayfalara linkleri kuran, tekrar eklemeyi önleyen `MutationObserver` tabanlı katman.
- `custom/flip-links.js`: çalışma anında kullanılan PDF link verileri ve sayfa offset ayarı.
- `custom/flip-links.json`: aynı linklerin taşınabilir JSON çıktısı.
- `custom/flip-center-turn.js`: üst/alt köşelerden başlayan hareketleri durdurur; orta bölgeden sayfa çevirmeyi korur.
- `patch/extract-pdf-links.py`: PDF URI annotation'larını yüzde koordinatlarına dönüştürür.
- `patch/apply-flip-link-fix.ps1`: yeni bir Flip export'una düzeltmeyi yeniden uygular.
- `patch/flip-link-fix.js`, `patch/flip-link-fix.css`, `patch/flip-links.js`, `patch/flip-links.json`: yeniden uygulama kaynakları.

Yedekler `_backup_before_link_fix/` klasöründedir. `index.html` ve köşe ayarı öncesindeki `config.js` ayrı olarak saklandı.

## 6. Sayfa 29 nasıl tespit edildi?

`kitap.pdf` sayfa 29, içeriği ve Şirvanşahlar Sarayı QR'ı üzerinden `files/mobile/29.jpg` ile görsel olarak eşleştirildi. Bu çıktıda PDF sayfa numarası ile Flip sayfa numarası aynı olduğundan `pageOffset=0` kullanıldı. Kod, kapak veya export farkı olan yeni çıktılar için `PageOffset` parametresini destekler.

## 7. Koordinat hesabı

PDF sayfa 29 ölçüsü yaklaşık `552.756 × 779.528` birimdir. Annotation dikdörtgeni normalize edildi ve PDF'nin alttan başlayan Y ekseni HTML'nin üstten başlayan Y eksenine çevrildi.

Şirvanşahlar Sarayı link alanı:

```text
left   = 59.440151%
top    = 22.107096%
width  = 7.459530%
height = 5.383642%
```

Alan, sabit ekran pikseli yerine sayfa yüzdesiyle `.side-content` içine eklenir. Link `target="_blank"` ve `rel="noopener noreferrer"` kullanır.

## 8. Test sonuçları

- Flipbook ve sayfa 29 başarıyla açıldı.
- Sayfa 29 QR katmanı doğru URL, yeni sekme hedefi ve güvenli `rel` değeriyle doğrulandı.
- Link tıklaması doğru tam URL'yi yeni sekmede açtı. Test sırasında uzak hedef sunucu 404 yanıtı verdi; bu Flip içindeki URL eşleşmesini değiştirmez.
- Zoom testinde sayfa `332 × 472` boyuttan `744 × 1056` boyuta büyürken link yüzdeleri ve QR hizası korundu.
- `390 × 844` mobil görünümde katman sayfayla birlikte ölçeklendi.
- Tam ekran düğmesi çıktı içinde mevcut. Link sayfa kapsayıcısının içinde olduğu için tam ekran dönüşümlerini sayfayla birlikte izler; işletim sistemi seviyesinde tam ekran otomasyonla tetiklenmedi.
- Üst sağ ve alt sağ köşeden sürükleme testlerinde sayfa `28–29` konumunda kaldı ve kıvrım oluşmadı.
- Sağ sayfanın orta bölümünden sürükleme testinde kitap `28–29` sayfasından `30–31` sayfasına geçti.
- Özel JavaScript dosyaları sözdizimi kontrolünden geçti; test edilen görünümde yeni console hatası oluşmadı.

## 9. Yeni export sonrasında patch'i uygulama

Yeni Flip çıktısı bu klasöre alındıktan sonra PowerShell'de:

```powershell
powershell -ExecutionPolicy Bypass -File .\patch\apply-flip-link-fix.ps1 `
  -PdfPath "C:\Users\vedat\Desktop\kitap.pdf" `
  -PageOffset 0 `
  -Regenerate
```

Yeni export'ta PDF sayfaları Flip sayfalarından bir ilerideyse `-PageOffset 1`, bir gerideyse `-PageOffset -1` kullanılmalıdır. Script özel dosyaları `custom/` klasörüne kopyalar, gerekli etiketleri `index.html` içine tekrar ekler ve `config.js` sonuna köşe kıvrımı kapatma ayarını uygular.

## 10. Bütün PDF linklerine genelleme

`extract-pdf-links.py`, PDF'deki tüm HTTP/HTTPS URI annotation'larını tarar; sayfa numarası, URL ve dikdörtgeni çıkarıp koordinatları yüzdeye dönüştürür. Bu PDF'de 264 sayfadan toplam 70 link üretildi. Runtime, ilgili `pageN` elemanı DOM'a geldiğinde linki ekler ve aynı URL/koordinat bileşimini ikinci kez eklemez.

Akış:

```text
PDF URI annotation
  -> dikdörtgen normalizasyonu
  -> sayfaya göre yüzde koordinatı
  -> flip-links.js / flip-links.json
  -> dinamik, responsive HTML link katmanı
```
