$pngDir = 'C:\Users\mahmut\.gemini\antigravity\brain\602e7fcd-8fa0-4825-8afe-e3d07dddec13\scratch\fen_png'
$ocrDir = 'C:\Users\mahmut\.gemini\antigravity\brain\602e7fcd-8fa0-4825-8afe-e3d07dddec13\scratch\fen_ocr'
if (-not (Test-Path $ocrDir)) { New-Item -ItemType Directory -Force -Path $ocrDir | Out-Null }

[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.FileAccessMode, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime] | Out-Null

$lang = [Windows.Globalization.Language]::new('tr')
$ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
if (-not $ocrEngine) {
    $ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
}

$files = Get-ChildItem -Path $pngDir -Filter '*.png'
foreach ($f in $files) {
    $absPath = $f.FullName
    $txtPath = Join-Path $ocrDir ($f.BaseName + '.txt')
    $file = [Windows.Storage.StorageFile]::GetFileFromPathAsync($absPath).GetAwaiter().GetResult()
    $stream = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read).GetAwaiter().GetResult()
    $decoder = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream).GetAwaiter().GetResult()
    $softwareBitmap = $decoder.GetSoftwareBitmapAsync().GetAwaiter().GetResult()
    $ocrResult = $ocrEngine.RecognizeAsync($softwareBitmap).GetAwaiter().GetResult()
    $lines = $ocrResult.Lines | ForEach-Object { $_.Text }
    [System.IO.File]::WriteAllLines($txtPath, $lines, [System.Text.Encoding]::UTF8)
    Write-Host "OCRed: $($f.Name) -> $($lines.Count) lines"
}
