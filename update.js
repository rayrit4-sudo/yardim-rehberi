// Günlük bakım: son başvuru günü geçen 'acik' kayıtları 'kapali' yapar (data.js ve otomatik.js).
// Yapay zeka kullanmaz, sadece tarih karşılaştırır. SON_KONTROL tarihine dokunmaz
// (o tarih, verinin kaynaklardan en son doğrulandığı gündür).
// Test için: FAKE_NOW=2026-10-17 node update.js
// Çıkış kodu: 10 = dosya değişti (yayın gerekli), 0 = değişmedi
const fs = require("fs");
const { yukle, otomatikYaz } = require("./lib");
const AYLAR = { ocak: 0, subat: 1, şubat: 1, mart: 2, nisan: 3, mayis: 4, mayıs: 4, haziran: 5, temmuz: 6, agustos: 7, ağustos: 7, eylul: 8, eylül: 8, ekim: 9, kasim: 10, kasım: 10, aralik: 11, aralık: 11 };
const now = process.env.FAKE_NOW ? new Date(process.env.FAKE_NOW + "T12:00:00") : new Date();

function bitis(s) {
  const m = s.toLowerCase().match(/(\d{1,2})\s+([a-zçğıöşü]+)\s+(\d{4})(?:.*?saat\s+(\d{1,2})[.:](\d{2}))?/);
  if (!m || !(m[2] in AYLAR)) return null;
  const saat = m[4] ? +m[4] : 23, dk = m[5] ? +m[5] : 59;
  return new Date(+m[3], AYLAR[m[2]], +m[1], saat, dk, 59);
}

const kapanan = [], bilinmeyen = [];
let degisti = false;

// 1) data.js: metin üzerinde
const dosya = __dirname + "/data.js";
const onceki = fs.readFileSync(dosya, "utf8");
const yeni = onceki.replace(/durum: "acik", sonBasvuru: "([^"]+)"/g, (tam, tarih) => {
  const b = bitis(tarih);
  if (!b) { bilinmeyen.push(tarih); return tam; }
  if (now > b) { kapanan.push(tarih); return 'durum: "kapali", sonBasvuru: "' + tarih + '"'; }
  return tam;
});
if (yeni !== onceki) { fs.writeFileSync(dosya, yeni); degisti = true; }

// 2) otomatik.js: JSON üzerinde
const oto = yukle().OTOMATIK;
let otoDegisti = false;
oto.forEach(y => {
  if (y.durum !== "acik" || !y.sonBasvuru) return;
  const b = bitis(y.sonBasvuru);
  if (!b) { bilinmeyen.push(y.sonBasvuru); return; }
  if (now > b) { y.durum = "kapali"; kapanan.push(y.sonBasvuru + " (otomatik)"); otoDegisti = true; }
});
if (otoDegisti) { otomatikYaz(oto); degisti = true; }

console.log(JSON.stringify({ zaman: now.toISOString(), kapananSayisi: kapanan.length, kapanan, bilinmeyenTarih: bilinmeyen }));
process.exit(degisti ? 10 : 0);
