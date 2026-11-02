[CmdletBinding()]
param(
    [string]$PdfPath,
    [int]$PageOffset = 0,
    [switch]$Regenerate
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$custom = Join-Path $root "custom"
$index = Join-Path $root "index.html"
$configPath = Join-Path $root "mobile/javascript/config.js"
$sourceJs = Join-Path $PSScriptRoot "flip-links.js"
$sourceJson = Join-Path $PSScriptRoot "flip-links.json"

$shouldExtract = $Regenerate -or ($PageOffset -ne 0) -or (-not (Test-Path -LiteralPath $sourceJs))
if ($PdfPath -or $shouldExtract) {
    if (-not $PdfPath) {
        $PdfPath = Join-Path (Split-Path -Parent $root) "kitap.pdf"
    }
    $pdf = (Resolve-Path -LiteralPath $PdfPath).Path
    $extractor = Join-Path $PSScriptRoot "extract-pdf-links.py"
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonCommand) {
        $pythonCommand = Get-Command py -ErrorAction SilentlyContinue
    }
    if (-not $pythonCommand) {
        throw "Python bulunamadı. Python 3 ve pypdf kurup komutu yeniden çalıştırın."
    }
    & $pythonCommand.Source $extractor $pdf --page-offset $PageOffset --output-js $sourceJs --output-json $sourceJson
    if ($LASTEXITCODE -ne 0) {
        throw "PDF link anotasyonları çıkarılamadı (exit code $LASTEXITCODE)."
    }
} else {
    $pdf = "(patch/flip-links.js içindeki önceden çıkarılmış veriler)"
}

New-Item -ItemType Directory -Force -Path $custom | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "flip-links.js") -Destination (Join-Path $custom "flip-links.js") -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "flip-links.json") -Destination (Join-Path $custom "flip-links.json") -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "flip-link-fix.js") -Destination (Join-Path $custom "flip-link-fix.js") -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "flip-link-fix.css") -Destination (Join-Path $custom "flip-link-fix.css") -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "flip-center-turn.js") -Destination (Join-Path $custom "flip-center-turn.js") -Force

$html = [System.IO.File]::ReadAllText($index)
$cssTag = '<link rel="stylesheet" type="text/css" href="custom/flip-link-fix.css" />'
$jsTag = '<script type="text/javascript" src="custom/flip-links.js"></script>' + "`r`n" +
    '<script type="text/javascript" src="custom/flip-link-fix.js"></script>'
$cornerJsTag = '<script type="text/javascript" src="custom/flip-center-turn.js"></script>'
if ($html -notmatch [regex]::Escape($cssTag)) {
    $html = $html.Replace('</head>', "    $cssTag`r`n</head>")
}
if ($html -notmatch 'custom/flip-link-fix\.js') {
    $html = $html.Replace('</body>', "    $jsTag`r`n</body>")
}
if ($html -notmatch 'custom/flip-center-turn\.js') {
    $html = $html.Replace('</body>', "    $cornerJsTag`r`n</body>")
}
[System.IO.File]::WriteAllText($index, $html, [System.Text.UTF8Encoding]::new($false))

if (Test-Path -LiteralPath $configPath) {
    $configText = [System.IO.File]::ReadAllText($configPath)
    $cornerOverride = 'bookConfig.CurlingPageCorner=false;'
    if ($configText -notmatch [regex]::Escape($cornerOverride)) {
        $configText += "`r`n// Disable top/bottom corner curls; keep middle page turns.`r`n$cornerOverride`r`n"
        [System.IO.File]::WriteAllText($configPath, $configText, [System.Text.UTF8Encoding]::new($false))
    }
}

Write-Output "Flip link patch uygulandı. PDF sayfa -> Flip sayfa: +$PageOffset"
Write-Output "Kaynak PDF: $pdf"
Write-Output "Özel dosyalar: $custom"
Write-Output "Üst/alt köşe kıvrımları kapatıldı; orta bölgeden sayfa çevirme açık."
