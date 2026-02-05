# PowerShell script to generate PDF manual using pandoc
# Usage: from project root run: powershell -ExecutionPolicy Bypass -File .\scripts\generate_manual.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root
$md = "DOCS/PROJECT_MANUAL.md"
$outPdf = "DOCS/PROJECT_MANUAL.pdf"

Write-Host "Generating PDF from $md -> $outPdf" -ForegroundColor Cyan

# Check pandoc
$pandoc = Get-Command pandoc -ErrorAction SilentlyContinue
if (-not $pandoc) {
    Write-Host "pandoc not found. Please install pandoc and a LaTeX distribution (MiKTeX/TinyTeX) to generate PDF." -ForegroundColor Yellow
    Write-Host "Windows install via Chocolatey: choco install pandoc miktex" -ForegroundColor Gray
    exit 1
}

# Build command. Include metadata and a simple PDF engine.
$cmd = @(
    'pandoc',
    '--from', 'markdown',
    '--pdf-engine=xelatex',
    '--toc',
    '--highlight-style', 'tango',
    '--output', $outPdf,
    $md
)

Write-Host "Running: $($cmd -join ' ')" -ForegroundColor Gray

$proc = Start-Process -FilePath $cmd[0] -ArgumentList $cmd[1..($cmd.Length-1)] -NoNewWindow -Wait -PassThru

if ($proc.ExitCode -eq 0) {
    Write-Host "PDF generado: $outPdf" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Falló la generación del PDF (exit code $($proc.ExitCode)). Revisa la instalación de pandoc/LaTeX." -ForegroundColor Red
    exit $proc.ExitCode
}
