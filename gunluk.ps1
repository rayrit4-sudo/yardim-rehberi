# Günlük bakım: süresi biten başvuruları kapatır, değişiklik varsa GitHub'a yükler ve Vercel'e gönderir.
# Windows Görev Zamanlayıcı her gün çalıştırır. Kayıt: gunluk.log
# -DryRun: yükleme ve yayın yapmaz, sadece ne yapacağını yazar.
param([switch]$DryRun)
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot
$log = Join-Path $PSScriptRoot "gunluk.log"
function Log($m) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $m" | Out-File -FilePath $log -Append -Encoding utf8 }

Log "başladı$(if ($DryRun) { ' (DryRun)' })"
$out = & node update.js 2>&1
$kod = $LASTEXITCODE
Log "update.js çıkış=$kod  $out"

if ($kod -eq 10) {
  & node check.js | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Log "HATA: check.js başarısız, yayın yapılmadı. data.js geri alınıyor."
    & git checkout -- data.js
    exit 1
  }
  if ($DryRun) { Log "DryRun: commit, push ve yayın atlandı."; & git checkout -- data.js; exit 0 }
  & git add data.js
  & git -c user.name="rayrit4-sudo" -c user.email="ayritr8@gmail.com" commit -q -m "Günlük bakım: süresi biten başvurular kapandı olarak işaretlendi"
  & git push -q origin main 2>&1 | ForEach-Object { Log "git push: $_" }
  $dep = & vercel deploy --prod --yes 2>&1 | Out-String
  Log "vercel: $(($dep -split "`n" | Select-String 'Aliased|Error|error' | Select-Object -First 2) -join ' | ')"
} else {
  Log "değişiklik yok."
}
Log "bitti"
