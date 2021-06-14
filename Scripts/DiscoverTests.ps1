#Requires -Modules @{ ModuleName="Pester";ModuleVersion="5.2.0" }
using namespace System.Collections.Generic
using namespace Pester

[CmdletBinding()]
param([Parameter(Mandatory)]$Path)

$VerbosePreference = 'Ignore'
$WarningPreference = 'Ignore'
$DebugPreference = 'Ignore'

function New-SuiteObject ([Block]$Block) {
    [PSCustomObject]@{
        type = 'suite'
        id = $Block.ScriptBlock.File + ';' + $Block.StartLine
        file = $Block.ScriptBlock.File
        line = $Block.StartLine - 1
        label = $Block.Name
        children = [List[Object]]@()
    }
}

function New-TestObject ([Test]$Test) {
    [PSCustomObject]@{
        type = 'test'
        id = $Test.ScriptBlock.File + ';' + $Test.StartLine
        file = $Test.ScriptBlock.File
        line = $Test.StartLine - 1
        label = $Test.Name
    }
}

function fold ($children, $Block) {
    foreach ($b in $Block.Blocks) {
        $o = (New-SuiteObject $b)
        $children.Add($o)
        fold $o.children $b
    }

    $hashset = [HashSet[string]]::new()
    foreach ($t in $Block.Tests) {
        $key = "$($t.ExpandedPath):$($t.StartLine)"
        if ($hashset.Contains($key)) {
            continue
        }
        $children.Add((New-TestObject $t))
        $hashset.Add($key) | Out-Null
    }
    $hashset.Clear() | Out-Null
}

$config = New-PesterConfiguration @{
    Run = @{
        Path = $path
        SkipRun = $true
        PassThru = $true
    }
    Output = @{
        Verbosity = 'None'
    }
}
$found = Invoke-Pester -Configuration $config


$testSuiteInfo = [PSCustomObject]@{
    type = 'suite'
    id = 'root'
    label = 'Pester'
    children = [Collections.Generic.List[Object]]@()
}

foreach ($file in $found.Containers.Blocks) {
    $fileSuite = [PSCustomObject]@{
        type = 'suite'
        id = $file.BlockContainer.Item.FullName
        file = $file.BlockContainer.Item.FullName
        label = $file.BlockContainer.Item.Name
        children = [Collections.Generic.List[Object]]@()
    }
    $testSuiteInfo.children.Add($fileSuite)
    fold $fileSuite.children $file
}

$testSuiteInfo | ConvertTo-Json -Depth 100