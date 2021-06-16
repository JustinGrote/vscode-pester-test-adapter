#Requires -Modules @{ ModuleName="Pester";ModuleVersion="5.2.0" }
using namespace System.Collections.Generic
using namespace Pester

[CmdletBinding()]
param(
    #Path(s) to search for tests. Paths can also contain line numbers (e.g. /path/to/file:25)
    [Parameter(Mandatory,ValueFromRemainingArguments)][String[]]$Path,
    #Only return "It" Test Results and not the resulting hierarcy
    [Switch]$TestsOnly,
    #Only return the test information, don't actually run them
    [Switch]$Discovery
)

$VerbosePreference = 'Ignore'
$WarningPreference = 'Ignore'
$DebugPreference = 'Ignore'

# Maps pester result status to vscode result status
enum ResultStatus {
    Unset
    Queued
    Running
    Passed
    Failed
    Skipped
    Errored
    NotRun #Pester Specific, this should be ignored
}

function New-SuiteObject ([Block]$Block) {
    [PSCustomObject]@{
        type = 'suite'
        id = $Block.ScriptBlock.File + ':' + $Block.StartLine
        file = $Block.ScriptBlock.File
        line = $Block.StartLine - 1
        label = $Block.Name
        children = [List[Object]]@()
    }
}

function New-TestObject ([Test]$Test) {
    if ($Test.ErrorRecord) {
        #TODO: Better handling once pester adds support
        #Reference: https://github.com/pester/Pester/issues/1993
        $Message = [string]$Test.ErrorRecord
        if ([string]$Test.ErrorRecord -match 'Expected (?<Expected>.+?), but (got )?(?<actual>.+?)\.$') {
            $Expected = $matches['Expected']
            $Actual = $matches['Actual']
        }
    }
    # TypeScript does not validate these data types, so numbers must be expressly stated so they don't get converted to strings
    [PSCustomObject]@{
        type = 'test'
        id = $Test.ScriptBlock.File + ':' + $Test.StartLine
        file = $Test.ScriptBlock.File
        startLine = [int]($Test.StartLine - 1) #Lines are zero-based in vscode
        endLine = [int]($Test.ScriptBlock.StartPosition.EndLine - 1) #Lines are zero-based in vscode
        label = $Test.Name
        result = [ResultStatus]$Test.Result
        duration = $Test.duration.Milliseconds #I don't think anyone is doing sub-millisecond code performance testing in Powershell :)
        message = $Message
        expected = $Expected
        actual = $Actual
        targetFile = $Test.ErrorRecord.TargetObject.File
        targetLine = [int]$Test.ErrorRecord.TargetObject.Line -1
        #TODO: Severity. Failed = Error Skipped = Warning
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

# These should be unique which is why we use a hashset
$paths = [HashSet[string]]::new()
$lines = [HashSet[string]]::new()

# Including both the path and the line speeds up the script by limiting the discovery surface
$Path.foreach{
    if ($PSItem -match '(?<Path>.+?):(?<Line>\d+)$') {
        [void]$paths.Add($matches['Path'])
        [void]$lines.Add($PSItem)
    } else {
        [void]$paths.Add($PSItem)
    }
}

$config = New-PesterConfiguration @{
    Run = @{
        SkipRun = [bool]$Discovery
        PassThru = $true
    }
    Output = @{
        Verbosity = 'None'
    }
}
if ($paths.Count) {
    $config.Run.Path = [string[]]$paths #Cast to string array is required or it will error
}
if ($lines.Count) {
    $config.Filter.Line = [string[]]$lines #Cast to string array is required or it will error
}

$runResult = Invoke-Pester -Configuration $config

if ($TestsOnly) {
    $testResult = $runResult.tests

    $testFilteredResult = if (-not $Discovery) {
        #If discovery was not run, its easy to filter the results
        $testResult | Where-Object Executed
    } elseif ($lines.count) {
        #A more esoteric filter is required because
        #BUG: Pester still returns all test discovery results in the file even if you only specify a particular line filter
        #TODO: File an issue on this
        #Returns true if the id matches. The ID is not a native property in pester, we have to construct it.
        $testResult | Where-Object {
            $Test = $PSItem
            $id = $Test.ScriptBlock.File + ':' + $Test.StartLine
            $id -in $lines
        }
    } else {
        $testResult
    }

    [Array]$testObjects = $testFilteredResult | ForEach-Object {
        New-TestObject $PSItem
    }

    # DO NOT USE THE PIPELINE, it will unwrap the array and cause a problem with single-item results
    return ConvertTo-Json $testObjects -Depth 100
}

# TODO: Hierarchical return
# if ($lines) {
#     #Only return the tests that were filtered
#     $lines.foreach{
#         if ($PSItem -match '(?<Path>.+?):(?<Line>\d+)$') { #Should always be true for lines
#             $runResult.tests
#         } else {
#             throw "An incorrect line specification was provided: $PSItem"
#         }
#     }
# }

# $testSuiteInfo = [PSCustomObject]@{
#     type = 'suite'
#     id = 'root'
#     label = 'Pester'
#     children = [Collections.Generic.List[Object]]@()
# }

# foreach ($file in $runResult.Containers.Blocks) {
#     $fileSuite = [PSCustomObject]@{
#         type = 'suite'
#         id = $file.BlockContainer.Item.FullName
#         file = $file.BlockContainer.Item.FullName
#         label = $file.BlockContainer.Item.Name
#         children = [Collections.Generic.List[Object]]@()
#     }
#     $testSuiteInfo.children.Add($fileSuite)
#     fold $fileSuite.children $file
# }

# $testSuiteInfo | ConvertTo-Json -Depth 100