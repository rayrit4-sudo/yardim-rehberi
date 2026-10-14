// Otomatik eklenen kayıtların (otomatik.js) 'kanit' alıntıları kaynak sayfada gerçekten var mı?
// - kanit: metin veya metin listesi. Her alıntı sayfada BİREBİR geçmeli.
// - Kaydın tutarındaki sayılar (örn. 10.000 veya "10 bin") alıntılarda geçmeli.
// - 'acik' kayıtta son başvuru günü ve ayı alıntılarda geçmeli.
// Kullanım: node verify.js            -> sadece raporlar (hata varsa çıkış 1)
//           node verify.js --sil      -> doğrulamayı geçemeyen otomatik kayıtları otomatik.js'ten siler
//           node verify.js --hepsi    -> elle kayıtlardan kanit'ı olanları da dener
const { norm, indir, yukle, otomatikYaz } = require("./lib");
const d = yukle();
const hepsi = process.argv.includes("--hepsi"), sil = process.argv.includes("--sil");
const liste = hepsi ? d.YARDIMLAR.filter(y => y.kanit) : d.OTOMATIK;

function sayilar(tutar) {
  return (tutar.match(/\d{1,3}(?:\.\d{3})+|\d{4,}/g) || []).map(s => {
    const x = s.replace(/\./g, "");
    const alt = [s, x];
    if (/000$/.test(x)) alt.push(String(+x / 1000) + " bin");
    return alt;
  });
}

(async () => {
  const gecen = [], kalan = [];
  for (const y of liste) {
    try {
      const sayfa = norm(await indir(y.kaynak));
      const kl = (Array.isArray(y.kanit) ? y.kanit : [y.kanit]).map(norm);
      if (!kl.length || kl.some(k => k.length < 15)) throw new Error("kanit yok veya cok kisa (en az 15 karakter)");
      for (const k of kl) if (!sayfa.includes(k)) throw new Error("kanit alinti sayfada bulunamadi: \"" + k.slice(0, 50) + "...\"");
      const birlesik = kl.join(" ");
      const sg = sayilar(y.tutar || "");
      if (sg.length && !sg.some(g => g.some(v => birlesik.includes(v.toLocaleLowerCase("tr")))))
        throw new Error("tutardaki sayi alintilarda gecmiyor: " + y.tutar.slice(0, 40));
      if (y.durum === "acik" && y.sonBasvuru) {
        const m = y.sonBasvuru.toLocaleLowerCase("tr").match(/(\d{1,2})\s+([a-zçğıöşü]+)/);
        if (!m || !(birlesik.includes(m[1] + " " + m[2]) || birlesik.includes(m[1] + " " + m[2].slice(0, 3))))
          throw new Error("son basvuru gunu alintilarda gecmiyor: " + y.sonBasvuru);
      }
      console.log("OK    ", y.il, "|", y.ad); gecen.push(y);
    } catch (e) { kalan.push(y); console.log("HATA  ", y.il, "|", y.ad, "->", e.message, "|", y.kaynak); }
  }
  console.log("Dogrulanan:", gecen.length, "/", liste.length);
  if (sil && !hepsi && kalan.length) { otomatikYaz(gecen); console.log("Silinen otomatik kayit:", kalan.length); process.exit(0); }
  process.exit(kalan.length ? 1 : 0);
})();
