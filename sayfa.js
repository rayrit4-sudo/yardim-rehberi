// Kullanım: node sayfa.js <url> [aranacak kelime] [bağlam uzunluğu]
// Sayfanın ham metnini yazar. Kelime verilirse sadece o kelimenin geçtiği yerleri bağlamıyla gösterir.
// Ajan, kayda 'kanit' yazarken alıntıyı BURADAN, birebir kopyalar.
const { norm, indir } = require("./lib");
(async () => {
  const [url, kelime, baglam] = process.argv.slice(2);
  if (!url) { console.log("Kullanim: node sayfa.js <url> [kelime] [baglam]"); process.exit(2); }
  try {
    const t = norm(await indir(url));
    if (!kelime) { console.log(t.slice(0, 6000)); return; }
    const k = kelime.toLocaleLowerCase("tr"), n = +baglam || 200;
    let i = 0, say = 0;
    while ((i = t.indexOf(k, i)) !== -1 && say < 8) { console.log("...", t.slice(Math.max(0, i - n), i + k.length + n), "...\n"); i += k.length; say++; }
    if (!say) console.log("(kelime bulunamadi)");
  } catch (e) { console.log("HATA:", e.message); process.exit(1); }
})();
