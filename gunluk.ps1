# Gunluk bakim:
#  1) Yapay zeka ajani 20 belediyenin yeni yardim duyurularini arar ve otomatik.js'e ekler (ajan_gorev.md)
#  2) Dogrulamayi gecemeyen otomatik kayitlar silinir (verify.js --sil), kurallara uymayan degisiklik geri alinir
#  3) Suresi biten basvurular kapatilir (update.js)
#  4) Degisiklik varsa GitHub'a yuklenir ve Vercel'e gonderilir
# Windows Gorev Zamanlayici her gun calistirir. Kayit: gunluk.log
# -Ajan: yapay zeka ajanini calistirir. VARSAYILAN KAPALI: kullanici acikca izin verene kadar sadece 2-4. adimlar calisir.
# -DryRun: yukleme ve yayin yapmaz, degisiklikleri loga yazip geri alir.
# NOT: Bu dosyada Turkce karakter kullanma (Windows PowerShell 5.1 bozuyor).
param([switch]$DryRun, [switch]$Ajan)
$SkipAgent = -not $Ajan
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot
$log = Join-Path $PSScriptRoot "gunluk.log"
$MAKS_YENI = 5
function Log($m) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $m" | Out-File -FilePath $log -Append -Encoding utf8 }
# Sadece betigin degistirdigi veri dosyalarini geri alir. Baska dosyalara (betigin kendisi dahil) dokunmaz.
function Geri-Al { & git checkout -- data.js otomatik.js 2>&1 | Out-Null }
function OtoSay { ([regex]::Matches((Get-Content otomatik.js -Raw -Encoding UTF8), '"otomatik":\s*true')).Count }

Log "basladi$(if ($DryRun) { ' (DryRun)' })$(if ($SkipAgent) { ' (SkipAgent)' })"
$once = OtoSay

# ---- 1) Ajan ----
if (-not $SkipAgent) {
  $bugun = Get-Date -Format "yyyy-MM-dd"
  $prompt = "Bugunun tarihi: $bugun. ajan_gorev.md dosyasini oku ve talimatlarina harfiyen uy."
  $claude = (Get-Command claude -ErrorAction SilentlyContinue).Source
  if (-not $claude) { Log "HATA: claude komutu bulunamadi, ajan atlandi." }
  else {
    $ozet = & $claude -p $prompt --model sonnet --permission-mode acceptEdits `
      --allowedTools "WebSearch" "WebFetch" "Read" "Edit" "Bash(node sayfa.js *)" "Bash(node check.js*)" "Bash(node verify.js*)" `
      --max-budget-usd 3 --output-format text 2>&1 | Out-String
    Log "ajan cikis=$LASTEXITCODE"
    Log ("ajan ozeti: " + (($ozet -replace "\s+", " ").Trim()))
  }

  # Guvenlik 1: sadece otomatik.js degismis olmali
  $degisen = @(& git status --porcelain | ForEach-Object { $_.Substring(3).Trim('"') })
  $yasak = @($degisen | Where-Object { $_ -ne "otomatik.js" })
  if ($yasak.Count -gt 0) {
    Log "UYARI: ajan izin verilmeyen dosyalara dokundu: $($yasak -join ', '). Bu dosyalar ve otomatik.js geri aliniyor."
    Geri-Al
    foreach ($f in $yasak) {
      & git ls-files --error-unmatch $f 2>&1 | Out-Null
      if ($LASTEXITCODE -eq 0) { & git checkout -- $f 2>&1 | Out-Null }
      elseif (Test-Path $f) { Remove-Item $f -Force -Recurse -ErrorAction SilentlyContinue }
    }
  }
  # Guvenlik 2: gunluk ekleme siniri
  $eklenen = (OtoSay) - $once
  if ($eklenen -gt $MAKS_YENI) { Log "UYARI: ajan $eklenen kayit ekledi (sinir $MAKS_YENI). Geri aliniyor."; Geri-Al }
}

# ---- 2) Dogrulama (alinti sayfada var mi, tutar/tarih alintida var mi) ----
$v = & node verify.js --sil 2>&1 | Out-String
Log ("verify: " + (($v -replace "\s+", " ").Trim()))
& node check.js 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Log "HATA: check.js basarisiz. Degisiklikler geri aliniyor, yayin yok."
  Log (& node check.js 2>&1 | Out-String)
  Geri-Al; Log "bitti (hata)"; exit 1
}

# ---- 3) Suresi biten basvurulari kapat ----
$u = & node update.js 2>&1 | Out-String
Log ("update: " + (($u -replace "\s+", " ").Trim()))

# ---- 4) Yayin ----
$fark = (& git status --porcelain | Out-String).Trim()
if (-not $fark) { Log "degisiklik yok."; Log "bitti"; exit 0 }
& node check.js 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Log "HATA: son check.js basarisiz, geri aliniyor."; Geri-Al; Log "bitti (hata)"; exit 1 }
Log ("degisen dosyalar: " + ($fark -replace "\s+", " "))
if ($DryRun) {
  Log ("DryRun fark: " + ((& git diff -U0 | Out-String) -replace "\s+", " "))
  Log "DryRun: commit, push ve yayin atlandi, geri aliniyor."; Geri-Al; Log "bitti"; exit 0
}
& git add -A
& git -c user.name="rayrit4-sudo" -c user.email="rayrit4-sudo@users.noreply.github.com" commit -q -m "Gunluk bakim: yeni duyurular ve kapanan basvurular"
& git push -q origin main 2>&1 | ForEach-Object { Log "git push: $_" }
$dep = & vercel deploy --prod --yes 2>&1 | Out-String
Log "vercel: $(($dep -split "`n" | Select-String 'Aliased|Error|error' | Select-Object -First 2) -join ' | ')"
Log "bitti"
