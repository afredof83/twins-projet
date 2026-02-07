$targetFile = Join-Path $PSScriptRoot "..\all_code.txt"
$rootPath = Join-Path $PSScriptRoot ".."

Write-Host "Target File: $targetFile"
Write-Host "Root Path: $rootPath"

# Clear file
$null | Out-File -FilePath $targetFile -Encoding UTF8

function Append-File {
    param ([string]$Path)
    Write-Host "Processing: $Path"
    "--- FILE: $Path ---" | Out-File -FilePath $targetFile -Append -Encoding UTF8
    "" | Out-File -FilePath $targetFile -Append -Encoding UTF8
    Get-Content -Path $Path -Raw | Out-File -FilePath $targetFile -Append -Encoding UTF8
    "" | Out-File -FilePath $targetFile -Append -Encoding UTF8
    "" | Out-File -FilePath $targetFile -Append -Encoding UTF8
}

# Root files
$rootFiles = @("package.json", "tsconfig.json", "next.config.ts", "README.md", ".env.example", "next-env.d.ts", "postcss.config.mjs", "tailwind.config.ts")
foreach ($file in $rootFiles) {
    $p = Join-Path $rootPath $file
    if (Test-Path $p) { Append-File -Path $p }
}

# Directories
$dirs = @("app", "components", "lib", "prisma", "scripts", "styles", "utils")
foreach ($d in $dirs) {
    $dp = Join-Path $rootPath $d
    if (Test-Path $dp) {
        Get-ChildItem -Path $dp -Recurse -File | Where-Object {
            $_.FullName -notmatch "node_modules" -and
            $_.Extension -match "^\.(ts|tsx|js|jsx|mjs|cjs|css|scss|sass|less|html|md|json|prisma|sql)$"
        } | ForEach-Object {
            Append-File -Path $_.FullName
        }
    }
}

Write-Host "Done."
