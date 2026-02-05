# Clear the output file
"" | Out-File -FilePath all_code.txt -Encoding UTF8

Write-Host "Collecting project files..." -ForegroundColor Cyan

# Get all relevant code files
# Get all relevant code files
$files = Get-ChildItem -Path . -Recurse -File | Where-Object { 
    $_.Extension -match '\.(ts|tsx|css|json|prisma|md)$' -and
    $_.FullName -notmatch '\\node_modules\\' -and 
    $_.FullName -notmatch '\\.next\\' -and
    $_.FullName -notmatch '\\.git\\' -and
    $_.Name -ne 'package-lock.json' -and
    $_.Name -ne 'all_code.txt'
}

$successCount = 0
$errorCount = 0

# Process each file
foreach ($file in $files) {
    try {
        Add-Content -Path all_code.txt -Value "`n=== $($file.FullName) ===`n" -Encoding UTF8
        Get-Content $file.FullName -ErrorAction Stop | Add-Content -Path all_code.txt -Encoding UTF8
        Write-Host "Processed: $($file.Name)" -ForegroundColor Gray
        $successCount++
    }
    catch {
        Write-Host "Error processing file: $($file.FullName)" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host "`nBackup complete!" -ForegroundColor Green
Write-Host "  Successfully processed: $successCount files" -ForegroundColor Green
if ($errorCount -gt 0) {
    Write-Host "  Errors encountered: $errorCount files" -ForegroundColor Yellow
}
