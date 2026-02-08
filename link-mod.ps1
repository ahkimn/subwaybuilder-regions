<#
.SYNOPSIS
    Symlink SubwayBuilder mod build and manifest into the game mods folder.
.DESCRIPTION
    Creates symlinks for index.js and manifest.json from project build folder into the game's Mods directory.
    Removes existing symlinks/files if they already exist.
.PARAMETER ProjectDir
    Path to the project folder containing dist/index.js and manifest.json
.PARAMETER GameModsDir
    Path to the game's Mods directory
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectDir,

    [Parameter(Mandatory=$true)]
    [string]$GameModsDir
)

# Resolve paths
$projectDir = Resolve-Path $ProjectDir
$gameModsDir = Resolve-Path $GameModsDir

# Files to link
$filesToLink = @(
    @{ Name = "index.js"; Source = Join-Path $projectDir "dist\index.js" },
    @{ Name = "manifest.json"; Source = Join-Path $projectDir "manifest.json" }
)

foreach ($file in $filesToLink) {
    $targetPath = Join-Path $gameModsDir $file.Name
    $sourcePath = $file.Source

    # Check if source exists
    if (-Not (Test-Path $sourcePath)) {
        Write-Warning "Source file does not exist: $sourcePath. Skipping."
        continue
    }

    # Remove existing link/file if present
    if (Test-Path $targetPath) {
        Remove-Item $targetPath -Force
    }

    # Determine item type
    $itemType = "File"
    if (Test-Path $sourcePath -PathType Container) { $itemType = "Directory" }

    # Create symlink
    New-Item -Path $targetPath -ItemType SymbolicLink -Target $sourcePath | Out-Null

    Write-Host "Created symlink: $targetPath -> $sourcePath"
}

Write-Host "`nAll symlinks created successfully!"
