# Define file paths
$outputFile = "all_code.txt"
$tempFile = "all_code_temp.txt"

# Clear/Create the temp file
"" | Out-File -FilePath $tempFile -Encoding UTF8 -Force

Write-Host "Collecting project files..." -ForegroundColor Cyan

# Get all relevant code files
$files = Get-ChildItem -Path . -Recurse -File | Where-Object { 
    $_.Extension -match '\.(ts|tsx|css|json|prisma|md)$' -and
    $_.FullName -notmatch '\\node_modules\\' -and 
    $_.FullName -notmatch '\\.next\\' -and
    $_.FullName -notmatch '\\.git\\' -and
    $_.Name -ne 'package-lock.json' -and
    $_.Name -ne $outputFile -and
    $_.Name -ne $tempFile
}

$successCount = 0
$errorCount = 0

# Process each file
foreach ($file in $files) {
    try {
        Add-Content -Path $tempFile -Value "`n=== $($file.FullName) ===`n" -Encoding UTF8 -ErrorAction Stop
        Get-Content $file.FullName -ErrorAction Stop | Add-Content -Path $tempFile -Encoding UTF8 -ErrorAction Stop
        Write-Host "Processed: $($file.Name)" -ForegroundColor Gray
        $successCount++
    }
    catch {
        Write-Host "Error processing file: $($file.Name)" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host "`nBackup creation complete!" -ForegroundColor Green
Write-Host "  Successfully processed: $successCount files" -ForegroundColor Green

if ($errorCount -gt 0) {
    Write-Host "  Errors encountered: $errorCount files" -ForegroundColor Yellow
}

# Try to replace the original file
try {
    if (Test-Path $outputFile) {
        Remove-Item $outputFile -Force -ErrorAction Stop
    }
    Rename-Item $tempFile $outputFile -Force -ErrorAction Stop
    Write-Host "`nSuccessfully updated $outputFile" -ForegroundColor Cyan
}
catch {
    Write-Host "`nCould not update $outputFile directly (it might be open/locked)." -ForegroundColor Red
    Write-Host "The new backup is saved as: $tempFile" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
