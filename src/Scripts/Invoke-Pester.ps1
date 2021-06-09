param(
    [String]$ScriptPath,
    [Int64]$LineNumber,
    [String]$OutputPath
)

$pesterModule = Microsoft.PowerShell.Core\\Get-Module Pester;
Write-Host '';
if (!$pesterModule) {
Write-Host 'Importing Pester module...';
$pesterModule = Microsoft.PowerShell.Core\\Import-Module Pester -ErrorAction Ignore -PassThru -MinimumVersion 5.0.0;
if (!$pesterModule) {
    Write-Warning 'Failed to import Pester. You must install Pester module (version 5.0.0 or newer) to run or debug Pester tests.';
    return;
};
};

if ($LineNumber -match '\\d+') {
$configuration = @{
    Run = @{
        Path = $ScriptPath;
    };
    Filter = @{
        Line = $ScriptPath + ':' + $LineNumber;
    };
};
if ('FromPreference' -ne $Output) {
    $configuration.Add('Output', @{ Verbosity = $Output });
};

if ($OutputPath) {
    $configuration.Add('TestResult', @{
        Enabled = $true;
        OutputPath = $OutputPath;
    });
};

Pester\\Invoke-Pester -Configuration $configuration | Out-Null;
} else {
$configuration = @{
    Run = @{
        Path = $ScriptPath;
    };
};

if ($OutputPath) {
    $configuration.Add('TestResult', @{
        Enabled = $true;
        OutputPath = $OutputPath;
    });
}
Pester\\Invoke-Pester -Configuration $configuration | Out-Null;
};