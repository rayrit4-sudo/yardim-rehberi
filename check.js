// Kural: kaynak linki, kaynak tarihi, durum ve tutar olmayan kayıt yayına giremez.
// acik/guncel/kapali kayıtlarda kaynak tarihi 2026 olmalı; acik kayıtta sonBasvuru zorunlu.
const fs = require("fs"), vm = require("vm");
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(__dirname + "/data.js", "utf8"), ctx);
const { ILLER, YARDIMLAR } = ctx.window;
const KIMLER = ["emekli", "cocuklu", "ihtiyac", "ogrenci", "evli", "engelli"];
const DURUMLAR = ["acik", "guncel", "kapali", "eski"];
let hata = 0;
YARDIMLAR.forEach((y, i) => {
  const eksik = [];
  if (!ILLER[y.il]) eksik.push("il");
  if (!y.ad) eksik.push("ad");
  if (!y.tutar) eksik.push("tutar");
  if (!y.kime) eksik.push("kime");
  if (!y.basvuru) eksik.push("basvuru");
  if (!/^https:\/\//.test(y.kaynak || "")) eksik.push("kaynak (https)");
  if (!y.kaynakTarih) eksik.push("kaynakTarih");
  if (!DURUMLAR.includes(y.durum)) eksik.push("durum");
  if (!Array.isArray(y.kim) || !y.kim.length || y.kim.some(k => !KIMLER.includes(k))) eksik.push("kim");
  if (["acik", "guncel", "kapali"].includes(y.durum) && !/2026/.test(y.kaynakTarih)) eksik.push("'" + y.durum + "' ama kaynak tarihi 2026 değil");
  if (y.durum === "acik" && !y.sonBasvuru) eksik.push("acik ama sonBasvuru yok");
  if (eksik.length) { hata++; console.log("HATA #" + i, y.ad || "?", "->", eksik.join(", ")); }
});
Object.keys(ILLER).forEach(k => { if (!YARDIMLAR.some(y => y.il === k)) { hata++; console.log("HATA: kaydı olmayan il:", k); } });
const say = {};
YARDIMLAR.forEach(y => { say[y.il] = say[y.il] || { acik: 0, guncel: 0, kapali: 0, eski: 0 }; say[y.il][y.durum]++; });
console.log("İl sayısı:", Object.keys(ILLER).length, "| Toplam kayıt:", YARDIMLAR.length, "| Hatalı:", hata);
console.table(say);
process.exit(hata ? 1 : 0);
