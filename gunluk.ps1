# Gunluk bakim: suresi biten basvurulari kapatir, degisiklik varsa GitHub'a yukler ve Vercel'e gonderir.
# Windows Gorev Zamanlayici her gun calistirir. Kayit: gunluk.log
# -DryRun: yukleme ve yayin yapmaz, sadece ne yapacagini yazar.
# NOT: Bu dosyada Turkce karakter kullanma (Windows PowerShell 5.1 bozuyor).
param([switch]$DryRun)
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot
$log = Join-Path $PSScriptRoot "gunluk.log"
function Log($m) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $m" | Out-File -FilePath $log -Append -Encoding utf8 }

Log "basladi$(if ($DryRun) { ' (DryRun)' })"
$out = & node update.js 2>&1
$kod = $LASTEXITCODE
Log "update.js cikis=$kod  $out"

if ($kod -eq 10) {
  & node check.js | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Log "HATA: check.js basarisiz, yayin yapilmadi. data.js geri aliniyor."
    & git checkout -- data.js
    exit 1
  }
  if ($DryRun) { Log "DryRun: commit, push ve yayin atlandi."; & git checkout -- data.js; exit 0 }
  & git add data.js
  & git -c user.name="rayrit4-sudo" -c user.email="ayritr8@gmail.com" commit -q -m "Gunluk bakim: suresi biten basvurular kapandi olarak isaretlendi"
  & git push -q origin main 2>&1 | ForEach-Object { Log "git push: $_" }
  $dep = & vercel deploy --prod --yes 2>&1 | Out-String
  Log "vercel: $(($dep -split "`n" | Select-String 'Aliased|Error|error' | Select-Object -First 2) -join ' | ')"
} else {
  Log "degisiklik yok."
}
Log "bitti"
