$projectRoot = (Get-Location).Path
$outputFile = Join-Path $projectRoot "all_code.txt"

$validExts = @(".ts", ".tsx", ".js", ".jsx", ".json", ".prisma", ".css")

# Only scan app, lib, prisma, public, and root-level files (skip node_modules etc entirely)
$scanDirs = @("app", "lib", "prisma", "public", "components", "utils", "types", "styles")

$filtered = New-Object System.Collections.ArrayList

# Root-level files
$rootFiles = Get-ChildItem -Path $projectRoot -File
foreach ($f in $rootFiles) {
    $ext = $f.Extension.ToLower()
    $matched = $false
    foreach ($v in $validExts) { if ($ext -eq $v) { $matched = $true; break } }
    if ($matched -and $f.Name -ne "all_code.txt" -and $f.Name -ne "gen_backup.ps1") {
        [void]$filtered.Add($f)
    }
}

# Subdirectory files  
foreach ($dir in $scanDirs) {
    $dirPath = Join-Path $projectRoot $dir
    if (Test-Path $dirPath) {
        $subFiles = Get-ChildItem -Path $dirPath -Recurse -File
        foreach ($f in $subFiles) {
            $ext = $f.Extension.ToLower()
            $matched = $false
            foreach ($v in $validExts) { if ($ext -eq $v) { $matched = $true; break } }
            if ($matched) {
                [void]$filtered.Add($f)
            }
        }
    }
}

Write-Host "Total files to backup: $($filtered.Count)"

$filtered = $filtered | Sort-Object FullName

$sb = New-Object System.Text.StringBuilder
foreach ($f in $filtered) {
    $rel = $f.FullName.Substring($projectRoot.Length + 1)
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("--- $rel ---")
    try {
        $content = [System.IO.File]::ReadAllText($f.FullName)
        [void]$sb.AppendLine($content)
    }
    catch {
        [void]$sb.AppendLine("(Could not read file)")
    }
}

[System.IO.File]::WriteAllText($outputFile, $sb.ToString(), [System.Text.Encoding]::UTF8)
Write-Host "Backup generated successfully!"
Write-Host "Total files included: $($filtered.Count)"
