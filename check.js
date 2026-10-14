// Kural: kaynak linki, kaynak tarihi, durum ve tutar olmayan kayıt yayına giremez.
// acik/guncel/kapali kayıtlarda kaynak tarihi 2026 olmalı; acik kayıtta sonBasvuru zorunlu.
// Kaynak, o ilin resmi alan adından olmalı. Otomatik kayıtlarda kanit alıntısı zorunlu.
const { yukle } = require("./lib");
const { ILLER, ALANLAR, ELLE, OTOMATIK, YARDIMLAR } = yukle();
const KIMLER = ["emekli", "cocuklu", "ihtiyac", "ogrenci", "evli", "engelli"];
const DURUMLAR = ["acik", "guncel", "kapali", "eski"];
const elleKaynak = new Set(ELLE.map(y => y.kaynak));
const gorulen = new Set();
let hata = 0;
YARDIMLAR.forEach((y, i) => {
  const eksik = [];
  const oto = OTOMATIK.includes(y);
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
  try {
    const host = new URL(y.kaynak).hostname.toLowerCase();
    if (!(ALANLAR[y.il] || []).some(a => host === a || host.endsWith("." + a))) eksik.push("kaynak alan adi '" + host + "' bu ilin resmi sitesi degil");
  } catch (e) { eksik.push("kaynak url gecersiz"); }
  if (oto) {
    const kl = Array.isArray(y.kanit) ? y.kanit : [y.kanit];
    if (!y.otomatik) eksik.push("otomatik.js'teki kayitta otomatik:true olmali");
    if (!y.kanit || kl.some(k => !k || k.length < 15)) eksik.push("kanit alintisi zorunlu (en az 15 karakter)");
    if (!/^2026-\d\d-\d\d$/.test(y.eklemeTarihi || "")) eksik.push("eklemeTarihi (YYYY-MM-DD) zorunlu");
    if (y.durum === "eski") eksik.push("otomatik kayit 'eski' olamaz");
    if (elleKaynak.has(y.kaynak)) eksik.push("kaynak zaten elle kayitlarda var (mukerrer)");
    const anahtar = y.il + "|" + (y.ad || "").toLowerCase();
    if (gorulen.has(anahtar)) eksik.push("ayni il ve adla mukerrer kayit");
    gorulen.add(anahtar);
  }
  if (eksik.length) { hata++; console.log("HATA #" + i, (oto ? "[otomatik] " : "") + (y.ad || "?"), "->", eksik.join(", ")); }
});
Object.keys(ILLER).forEach(k => { if (!YARDIMLAR.some(y => y.il === k)) { hata++; console.log("HATA: kaydı olmayan il:", k); } });
const say = {};
YARDIMLAR.forEach(y => { say[y.il] = say[y.il] || { acik: 0, guncel: 0, kapali: 0, eski: 0 }; say[y.il][y.durum]++; });
console.log("İl sayısı:", Object.keys(ILLER).length, "| Elle:", ELLE.length, "| Otomatik:", OTOMATIK.length, "| Hatalı:", hata);
if (process.argv.includes("--tablo")) console.table(say);
process.exit(hata ? 1 : 0);
