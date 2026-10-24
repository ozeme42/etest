param(
    [string]$imagePath
)

[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.FileAccessMode, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime] | Out-Null

$absPath = (Resolve-Path $imagePath).Path
$file = [Windows.Storage.StorageFile]::GetFileFromPathAsync($absPath).GetAwaiter().GetResult()
$stream = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read).GetAwaiter().GetResult()
$decoder = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream).GetAwaiter().GetResult()
$softwareBitmap = $decoder.GetSoftwareBitmapAsync().GetAwaiter().GetResult()

$lang = [Windows.Globalization.Language]::new("tr")
$ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
$ocrResult = $ocrEngine.RecognizeAsync($softwareBitmap).GetAwaiter().GetResult()

foreach ($line in $ocrResult.Lines) {
    Write-Output $line.Text
}
