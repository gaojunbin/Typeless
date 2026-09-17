$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$source = Join-Path $PSScriptRoot 'Helper.cs'
try {
    $references = @('System.Windows.Forms', 'System.Web.Extensions')
    Add-Type -Path $source -ReferencedAssemblies $references
    [TypelessNative]::Run()
} catch {
    [Console]::Error.WriteLine('Native helper could not start. Use manual copy mode; Windows native validation is required.')
    exit 1
}
