// Ortak yardımcılar: sayfa indirme, metin normalleştirme, veri yükleme/yazma.
const https = require("https"), http = require("http"), fs = require("fs"), vm = require("vm");

function norm(s) {
  return (s || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[‘’“”]/g, "'")
    .replace(/\s+/g, " ").trim().toLocaleLowerCase("tr");
}

function indir(url, hop) {
  hop = hop || 0;
  return new Promise((res, rej) => {
    const m = url.startsWith("https") ? https : http;
    const q = m.get(url, { timeout: 25000, headers: { "User-Agent": "Mozilla/5.0 (yardim-rehberi dogrulama)", "Accept-Language": "tr" } }, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && hop < 4) {
        r.resume(); return res(indir(new URL(r.headers.location, url).href, hop + 1));
      }
      if (r.statusCode >= 400) { r.resume(); return rej(new Error("HTTP " + r.statusCode)); }
      const parts = []; r.on("data", d => parts.push(d)); r.on("end", () => res(Buffer.concat(parts).toString("utf8")));
    });
    q.on("error", e => rej(new Error(e.code || e.message)));
    q.on("timeout", () => { q.destroy(); rej(new Error("TIMEOUT")); });
  });
}

const DIR = __dirname;
// data.js ve otomatik.js'i yükler. YARDIMLAR = elle doğrulananlar + otomatik bulunanlar.
function yukle() {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(DIR + "/data.js", "utf8"), ctx);
  vm.runInNewContext(fs.readFileSync(DIR + "/otomatik.js", "utf8"), ctx);
  const w = ctx.window;
  return { ILLER: w.ILLER, ALANLAR: w.ALANLAR, ELLE: w.YARDIMLAR, OTOMATIK: w.OTOMATIK || [], YARDIMLAR: w.YARDIMLAR.concat(w.OTOMATIK || []) };
}
function otomatikYaz(liste) {
  const bas = fs.readFileSync(DIR + "/otomatik.js", "utf8").split("window.OTOMATIK")[0];
  fs.writeFileSync(DIR + "/otomatik.js", bas + "window.OTOMATIK = " + JSON.stringify(liste, null, 2) + ";\n");
}

module.exports = { norm, indir, yukle, otomatikYaz };
