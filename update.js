// Günlük bakım: son başvuru günü geçen 'acik' kayıtları 'kapali' yapar.
// Yapay zeka kullanmaz, sadece tarih karşılaştırır. SON_KONTROL tarihine dokunmaz
// (o tarih, verinin insan/AI tarafından en son kaynaklardan doğrulandığı gündür).
// Test için: FAKE_NOW=2026-10-17 node update.js
// Çıkış kodu: 10 = dosya değişti (yayın gerekli), 0 = değişmedi
const fs = require("fs");
const file = __dirname + "/data.js";
const onceki = fs.readFileSync(file, "utf8");
const AYLAR = { ocak: 0, subat: 1, şubat: 1, mart: 2, nisan: 3, mayis: 4, mayıs: 4, haziran: 5, temmuz: 6, agustos: 7, ağustos: 7, eylul: 8, eylül: 8, ekim: 9, kasim: 10, kasım: 10, aralik: 11, aralık: 11 };
const now = process.env.FAKE_NOW ? new Date(process.env.FAKE_NOW + "T12:00:00") : new Date();

function bitis(s) {
  const m = s.toLowerCase().match(/(\d{1,2})\s+([a-zçğıöşü]+)\s+(\d{4})(?:.*?saat\s+(\d{1,2})[.:](\d{2}))?/);
  if (!m || !(m[2] in AYLAR)) return null;
  const saat = m[4] ? +m[4] : 23, dk = m[5] ? +m[5] : 59;
  return new Date(+m[3], AYLAR[m[2]], +m[1], saat, dk, 59);
}

const kapanan = [], bilinmeyen = [];
const yeni = onceki.replace(/durum: "acik", sonBasvuru: "([^"]+)"/g, (tam, tarih) => {
  const b = bitis(tarih);
  if (!b) { bilinmeyen.push(tarih); return tam; }
  if (now > b) { kapanan.push(tarih); return 'durum: "kapali", sonBasvuru: "' + tarih + '"'; }
  return tam;
});

if (yeni !== onceki) fs.writeFileSync(file, yeni);
console.log(JSON.stringify({ zaman: now.toISOString(), kapananSayisi: kapanan.length, kapanan, bilinmeyenTarih: bilinmeyen }));
process.exit(yeni !== onceki ? 10 : 0);
